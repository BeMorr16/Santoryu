import { existsSync } from "node:fs";
import { Duration } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import type { SiteConfig } from "./config.ts";

export interface ContactApiProps {
  config: SiteConfig;
  zone: route53.IPublicHostedZone;
}

/**
 * The contact form's API, minus the distribution behavior and WAF rule, which belong to SiteStack's
 * existing resources: the Java function, email identities, DMARC and alarms (contact-form design §4).
 */
export class ContactApi extends Construct {
  readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, { config, zone }: ContactApiProps) {
    super(scope, id);

    if (!existsSync(config.contactArtifact)) {
      throw new Error(`Run pnpm run build first (expected ${config.contactArtifact})`);
    }

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Its own role, because the basic execution managed policy allows logging to `*` (R11.4).
    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    logGroup.grantWrite(role);

    const fn = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.JAVA_25,
      architecture: lambda.Architecture.ARM_64,
      handler: "com.benmorrison.contact.ContactHandler",
      code: lambda.Code.fromAsset(config.contactArtifact),
      memorySize: 512,
      timeout: Duration.seconds(12),
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
      role,
      logGroup,
      environment: {
        SITE_ORIGIN: `https://${config.domainName}`,
        TURNSTILE_SECRET_PARAMETER: config.turnstileSecretParameter,
        CONTACT_FROM: `contact@${config.domainName}`,
        CONTACT_TO: config.contactEmail,
      },
    });

    const alias = new lambda.Alias(this, "LiveAlias", {
      aliasName: "live",
      version: fn.currentVersion,
    });
    this.functionUrl = alias.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM });

    // Lambda deletes a Java snapshot after 14 days without an invocation, and the next call then
    // fails until a new one is ready, so a quiet site needs this ping. Shaped like a Function URL
    // GET, it gets a 405 and sends nothing (contact-form R11.3).
    new events.Rule(this, "KeepSnapshotRule", {
      schedule: events.Schedule.rate(Duration.days(7)),
      targets: [
        new targets.LambdaFunction(alias, {
          event: events.RuleTargetInput.fromObject({ requestContext: { http: { method: "GET" } } }),
        }),
      ],
    });

    const domainIdentity = new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.publicHostedZone(zone),
    });
    const ownerIdentity = new ses.EmailIdentity(this, "OwnerIdentity", {
      identity: ses.Identity.email(config.contactEmail),
    });
    // In the sandbox, SES checks the sender and the recipient against the role's permissions.
    domainIdentity.grantSendEmail(role);
    ownerIdentity.grantSendEmail(role);

    ssm.StringParameter.fromSecureStringParameterAttributes(this, "TurnstileSecret", {
      parameterName: config.turnstileSecretParameter,
    }).grantRead(role);

    // No rua: a reporting address would be published in DNS (R9.4).
    new route53.TxtRecord(this, "DmarcRecord", {
      zone,
      recordName: `_dmarc.${config.domainName}`,
      values: ["v=DMARC1; p=quarantine"],
    });

    // No enforceSSL: its Deny-only topic policy would replace the default that lets CloudWatch publish.
    const topic = new sns.Topic(this, "AlarmTopic");
    // Not EmailSubscription: it builds a logical ID from the address, and deploys print logical IDs
    // to public CI logs, where the sanitized form slips past GitHub's secret masking (R9.5).
    new sns.Subscription(this, "AlarmSubscription", {
      topic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: config.contactEmail,
    });
    const alarmAction = new actions.SnsAction(topic);

    // A handled failure returns a clean 503, which Lambda's Errors metric doesn't count (R12.2).
    const unavailable = logGroup
      .addMetricFilter("UnavailableFilter", {
        filterPattern: logs.FilterPattern.stringValue("$.outcome", "=", "unavailable"),
        metricNamespace: "PersonalSite/Contact",
        metricName: "Unavailable",
        metricValue: "1",
      })
      .metric({ statistic: cloudwatch.Stats.SUM, period: Duration.minutes(5) });

    for (const [alarmId, metric, description] of [
      ["ErrorsAlarm", fn.metricErrors({ period: Duration.minutes(5) }), "The function crashed."],
      ["UnavailableAlarm", unavailable, "Cloudflare or SES failed, so visitors can't send."],
    ] as const) {
      new cloudwatch.Alarm(this, alarmId, {
        metric,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      }).addAlarmAction(alarmAction);
    }
  }
}
