import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { defineApp } from "../src/app.ts";
import { readSiteManifest } from "../src/site-manifest.ts";
import { testApp, testConfig, testEnv } from "./stack-harness.ts";

const manifest = readSiteManifest(testConfig.siteManifest, testConfig.siteDir);

function synth(overrides: Partial<typeof testConfig> = {}): Template {
  const { site } = defineApp(testApp(), {
    config: { ...testConfig, ...overrides },
    manifest,
    account: testEnv.account,
  });
  return Template.fromStack(site);
}

type Resource = { Type: string; Properties: Record<string, unknown> };
type Statement = { Action: string | string[]; Resource: unknown };

function resources(template: Template, type: string): [string, Resource][] {
  const all = template.toJSON().Resources as Record<string, Resource>;
  return Object.entries(all).filter(([, resource]) => resource.Type === type);
}

let template: Template;

beforeAll(() => {
  template = synth();
});

function contactFunction(): Resource {
  const found = resources(template, "AWS::Lambda::Function").filter(([id]) =>
    id.startsWith("ContactApi"),
  );
  expect(found).toHaveLength(1);
  return (found[0] as [string, Resource])[1];
}

function roleStatements(): Statement[] {
  const found = resources(template, "AWS::IAM::Policy").filter(([id]) =>
    id.startsWith("ContactApiRole"),
  );
  expect(found).toHaveLength(1);
  const policy = (found[0] as [string, Resource])[1];
  return (policy.Properties.PolicyDocument as { Statement: Statement[] }).Statement;
}

describe("ContactApi: function and URL (R8.2, R8.3, R9.3, R11.1, R11.3)", () => {
  it("runs on java25, arm64, with SnapStart on published versions", () => {
    expect(contactFunction().Properties).toMatchObject({
      Runtime: "java25",
      Architectures: ["arm64"],
      Handler: "com.benmorrison.contact.ContactHandler",
      MemorySize: 512,
      Timeout: 12,
      SnapStart: { ApplyOn: "PublishedVersions" },
    });
  });

  it("passes the handler the settings it reads, and the secret's name only", () => {
    expect(contactFunction().Properties.Environment).toEqual({
      Variables: {
        SITE_ORIGIN: "https://example.test",
        TURNSTILE_SECRET_PARAMETER: "/test/contact/turnstile-secret",
        CONTACT_FROM: "contact@example.test",
        CONTACT_TO: "owner@example.test",
      },
    });
  });

  it("serves the live alias through an AWS_IAM Function URL, with no CORS", () => {
    template.hasResourceProperties("AWS::Lambda::Alias", { Name: "live" });
    template.resourceCountIs("AWS::Lambda::Url", 1);
    template.hasResourceProperties("AWS::Lambda::Url", {
      AuthType: "AWS_IAM",
      Qualifier: "live",
      Cors: Match.absent(),
    });
  });

  it("reserves no concurrency, since the account's quota doesn't allow it", () => {
    expect(JSON.stringify(template.toJSON())).not.toContain("ReservedConcurrentExecutions");
  });

  it("keeps its logs for one month", () => {
    const logGroup = contactFunction().Properties.LoggingConfig as { LogGroup: { Ref: string } };
    const all = template.toJSON().Resources as Record<string, Resource>;
    expect(all[logGroup.LogGroup.Ref]?.Properties.RetentionInDays).toBe(30);
  });

  it("outputs the URL, for the direct-call check", () => {
    template.hasOutput("ContactFunctionUrl", {
      Value: { "Fn::GetAtt": [Match.stringLikeRegexp("^ContactApi"), "FunctionUrl"] },
    });
  });

  it("asks for a build when the jar is missing", () => {
    expect(() => synth({ contactArtifact: "/does/not/exist.jar" })).toThrow(
      "Run pnpm run build first (expected /does/not/exist.jar)",
    );
  });
});

describe("ContactApi: keeping the SnapStart snapshot (R11.3)", () => {
  const rule = () => {
    const found = resources(template, "AWS::Events::Rule");
    expect(found).toHaveLength(1);
    return (found[0] as [string, Resource])[1].Properties as {
      ScheduleExpression: string;
      Targets: { Arn: unknown; Input: string }[];
    };
  };

  it("invokes at least every 14 days, the limit before Lambda deletes a Java snapshot", () => {
    expect(rule().ScheduleExpression).toBe("rate(7 days)");
  });

  it("targets the live alias, whose version holds the snapshot", () => {
    expect(rule().Targets).toHaveLength(1);
    expect(JSON.stringify(rule().Targets[0]?.Arn)).toContain("ContactApiLiveAlias");
  });

  it("sends a GET-shaped event, which the handler answers with 405 and no email", () => {
    expect(JSON.parse(rule().Targets[0]?.Input ?? "")).toEqual({
      requestContext: { http: { method: "GET" } },
    });
  });

  it("lets only that rule invoke the alias through EventBridge", () => {
    const permissions = resources(template, "AWS::Lambda::Permission").filter(
      ([, permission]) => permission.Properties.Principal === "events.amazonaws.com",
    );
    expect(permissions).toHaveLength(1);
    const permission = (permissions[0] as [string, Resource])[1].Properties;
    expect(permission.Action).toBe("lambda:InvokeFunction");
    expect(JSON.stringify(permission.FunctionName)).toContain("ContactApiLiveAlias");
    expect(JSON.stringify(permission.SourceArn)).toContain("ContactApiKeepSnapshotRule");
  });
});

describe("ContactApi: least privilege (R8.4, R11.4)", () => {
  it("allows only writing its logs, sending through two identities and reading one parameter", () => {
    const actions = roleStatements()
      .flatMap((statement) => statement.Action)
      .sort();
    expect(actions).toEqual([
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ssm:DescribeParameters",
      "ssm:GetParameter",
      "ssm:GetParameterHistory",
      "ssm:GetParameters",
    ]);
  });

  it("uses no wildcards in its actions or resources", () => {
    for (const statement of roleStatements()) {
      expect([statement.Action].flat()).not.toContainEqual(expect.stringContaining("*"));
      expect([statement.Resource].flat()).not.toContain("*");
    }
  });

  it("names exactly the two identities and the one parameter", () => {
    const resourcesOf = (prefix: string) =>
      roleStatements()
        .filter((statement) => [statement.Action].flat()[0]?.startsWith(prefix))
        .flatMap((statement) => [statement.Resource].flat());

    const identities = JSON.stringify(resourcesOf("ses:"));
    expect(resourcesOf("ses:")).toHaveLength(2);
    expect(identities).toContain(":identity/");
    expect(identities).toMatch(/ContactApiDomainIdentity/);
    expect(identities).toMatch(/ContactApiOwnerIdentity/);

    expect(resourcesOf("ssm:")).toEqual([
      "arn:aws:ssm:us-east-1:111111111111:parameter/test/contact/turnstile-secret",
    ]);
  });

  it("doesn't attach the basic execution policy, which allows logging to `*`", () => {
    const roles = resources(template, "AWS::IAM::Role").filter(([id]) =>
      id.startsWith("ContactApi"),
    );
    expect(roles).toHaveLength(1);
    expect((roles[0] as [string, Resource])[1].Properties.ManagedPolicyArns).toBeUndefined();
  });

  it("creates no parameter, and no template value can hold the secret", () => {
    template.resourceCountIs("AWS::SSM::Parameter", 0);
    expect(JSON.stringify(template.toJSON())).not.toContain("resolve:ssm-secure");
  });
});

describe("ContactApi: email identities and DMARC (R9.5, R11.5)", () => {
  it("verifies the domain and the owner's address", () => {
    template.resourceCountIs("AWS::SES::EmailIdentity", 2);
    template.hasResourceProperties("AWS::SES::EmailIdentity", { EmailIdentity: "example.test" });
    template.hasResourceProperties("AWS::SES::EmailIdentity", {
      EmailIdentity: "owner@example.test",
    });
  });

  it("publishes the three DKIM records in the existing zone", () => {
    const dkim = resources(template, "AWS::Route53::RecordSet").filter(
      ([, record]) => record.Properties.Type === "CNAME",
    );
    expect(dkim).toHaveLength(3);
    for (const [, record] of dkim) {
      expect(record.Properties.HostedZoneId).toBe(testConfig.hostedZoneId);
    }
  });

  it("publishes DMARC at quarantine, with no reporting address", () => {
    template.hasResourceProperties("AWS::Route53::RecordSet", {
      Name: "_dmarc.example.test.",
      Type: "TXT",
      ResourceRecords: ['"v=DMARC1; p=quarantine"'],
    });
    expect(JSON.stringify(template.toJSON())).not.toContain("rua=");
  });

  it("keeps the owner's address out of logical IDs, which deploys print to public logs", () => {
    const json = template.toJSON() as { Resources: Record<string, unknown>; Outputs: unknown };
    // EmailSubscription would add a logical ID ending in this sanitized form of the address.
    expect(Object.keys(json.Resources).join(" ")).not.toContain("ownerexampletest");
    expect(JSON.stringify(json.Outputs)).not.toContain(testConfig.contactEmail);
  });
});

describe("ContactApi: alarms (R12.1, R12.2)", () => {
  it("turns an unavailable outcome into a metric", () => {
    template.hasResourceProperties("AWS::Logs::MetricFilter", {
      FilterPattern: '{ $.outcome = "unavailable" }',
      MetricTransformations: [
        { MetricNamespace: "PersonalSite/Contact", MetricName: "Unavailable", MetricValue: "1" },
      ],
    });
  });

  const alarm = {
    Threshold: 1,
    EvaluationPeriods: 1,
    Period: 300,
    Statistic: "Sum",
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    TreatMissingData: "notBreaching",
    AlarmActions: [{ Ref: Match.stringLikeRegexp("^ContactApiAlarmTopic") }],
  };

  it("alarms on Lambda errors", () => {
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      ...alarm,
      Namespace: "AWS/Lambda",
      MetricName: "Errors",
    });
  });

  it("alarms on a clean 503, which the Errors metric doesn't count", () => {
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      ...alarm,
      Namespace: "PersonalSite/Contact",
      MetricName: "Unavailable",
    });
  });

  it("leaves SNS's default topic policy, which is what lets CloudWatch publish", () => {
    template.resourceCountIs("AWS::SNS::TopicPolicy", 0);
  });

  it("creates only those two alarms and emails the owner", () => {
    template.resourceCountIs("AWS::CloudWatch::Alarm", 2);
    template.resourceCountIs("AWS::SNS::Topic", 1);
    template.resourceCountIs("AWS::SNS::Subscription", 1);
    template.hasResourceProperties("AWS::SNS::Subscription", {
      Protocol: "email",
      Endpoint: "owner@example.test",
    });
  });
});

describe("SiteStack: the /api/contact behavior (R8.6, R11.2)", () => {
  type Behavior = Record<string, unknown> & { PathPattern: string; TargetOriginId: string };
  const distributionConfig = () => {
    const distribution = resources(template, "AWS::CloudFront::Distribution")[0] as [
      string,
      Resource,
    ];
    return distribution[1].Properties.DistributionConfig as {
      CacheBehaviors: Behavior[];
      Origins: { Id: string; OriginAccessControlId?: unknown; CustomOriginConfig?: unknown }[];
    };
  };

  it("serves only that exact path: HTTPS only, every method, no caching", () => {
    const behaviors = distributionConfig().CacheBehaviors;
    expect(behaviors).toHaveLength(1);
    expect(behaviors[0]).toMatchObject({
      PathPattern: "/api/contact",
      ViewerProtocolPolicy: "https-only",
      AllowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
    });
  });

  it("uses the managed policies: CachingDisabled and AllViewerExceptHostHeader", () => {
    expect(distributionConfig().CacheBehaviors[0]).toMatchObject({
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
      OriginRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    });
  });

  it("runs the viewer-response function only, because viewer-request rewrites unknown paths", () => {
    const associations = distributionConfig().CacheBehaviors[0]?.FunctionAssociations as {
      EventType: string;
    }[];
    expect(associations.map((association) => association.EventType)).toEqual(["viewer-response"]);
  });

  it("signs requests to the function with a lambda OAC", () => {
    template.hasResourceProperties("AWS::CloudFront::OriginAccessControl", {
      OriginAccessControlConfig: Match.objectLike({
        OriginAccessControlOriginType: "lambda",
        SigningBehavior: "always",
        SigningProtocol: "sigv4",
      }),
    });
    const config = distributionConfig();
    const origin = config.Origins.find((o) => o.Id === config.CacheBehaviors[0]?.TargetOriginId);
    expect(origin?.OriginAccessControlId).toBeDefined();
    expect(origin?.CustomOriginConfig).toMatchObject({ OriginProtocolPolicy: "https-only" });
  });

  it("grants both invoke permissions, scoped to this distribution", () => {
    const permissions = resources(template, "AWS::Lambda::Permission").filter(
      ([, permission]) => permission.Properties.Principal === "cloudfront.amazonaws.com",
    );
    expect(permissions.map(([, p]) => p.Properties.Action).sort()).toEqual([
      "lambda:InvokeFunction",
      "lambda:InvokeFunctionUrl",
    ]);
    const invoke = permissions.find(([, p]) => p.Properties.Action === "lambda:InvokeFunction");
    expect(invoke?.[1].Properties.InvokedViaFunctionUrl).toBe(true);
    for (const [, permission] of permissions) {
      expect(JSON.stringify(permission.Properties.SourceArn)).toContain("SiteDistribution");
      expect(JSON.stringify(permission.Properties.FunctionName)).toContain("FunctionUrl");
    }
  });

  it("keeps the default behavior's settings and functions", () => {
    const config = (
      resources(template, "AWS::CloudFront::Distribution")[0] as [string, Resource]
    )[1].Properties.DistributionConfig as {
      DefaultCacheBehavior: Record<string, unknown> & { FunctionAssociations: unknown[] };
    };
    expect(config.DefaultCacheBehavior).toMatchObject({
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: ["GET", "HEAD"],
    });
    expect(config.DefaultCacheBehavior.FunctionAssociations).toHaveLength(2);
  });
});

describe("SiteStack: rate limiting for the API (R8.1, R8.6)", () => {
  // The Free plan rejected a second rule scoped to /api/contact on the first deploy (2026-11-05),
  // so the API shares the site-wide rule (design §4's fallback).
  it("keeps the single site-wide rule, which covers the API too, and no rule groups", () => {
    const acl = resources(synth({ flatRatePlan: true }), "AWS::WAFv2::WebACL")[0] as [
      string,
      Resource,
    ];
    const rules = acl[1].Properties.Rules as {
      Name: string;
      Statement: { RateBasedStatement: Record<string, unknown> };
    }[];

    expect(rules.map((rule) => rule.Name)).toEqual(["rate-limit-per-ip"]);
    expect(rules[0]?.Statement.RateBasedStatement).not.toHaveProperty("ScopeDownStatement");
    expect(JSON.stringify(rules)).not.toMatch(
      /RuleGroupReferenceStatement|ManagedRuleGroupStatement|ByteMatchStatement/,
    );
  });
});
