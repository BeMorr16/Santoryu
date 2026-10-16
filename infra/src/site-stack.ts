import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as pricingplanmanager from "aws-cdk-lib/aws-pricingplanmanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";
import { PROJECT_TAG, type SiteConfig } from "./config.ts";
import { renderViewerRequest, renderViewerResponse } from "./edge-functions.ts";
import { publishGroups } from "./publish-groups.ts";
import type { SiteManifest } from "./site-manifest.ts";

export interface SiteStackProps extends StackProps {
  config: SiteConfig;
  manifest: SiteManifest;
}

/** The static site: private bucket, CloudFront, certificate and DNS (static-hosting design §7.1). */
export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);
    const { config, manifest } = props;
    const wwwName = `www.${config.domainName}`;

    const bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      minimumTLSVersion: 1.2,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(1) }],
    });

    // Imported, not looked up, so synth needs no AWS credentials (R5.7).
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: config.hostedZoneId,
      zoneName: config.domainName,
    });

    const certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: config.domainName,
      subjectAlternativeNames: [wwwName],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    const viewerRequest = new cloudfront.Function(this, "ViewerRequestFunction", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(
        renderViewerRequest({ apex: config.domainName, files: manifest.files }),
      ),
      comment: "Host and URL canonicalization, page routing, 404 rewrites",
    });
    const viewerResponse = new cloudfront.Function(this, "ViewerResponseFunction", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(renderViewerResponse()),
      comment: "Security headers, per-page CSP, not-found status",
    });

    // Only /assets/* misses reach the origin as errors; they get the 404 page without headers (D1).
    const notFound = (httpStatus: number): cloudfront.ErrorResponse => ({
      httpStatus,
      responseHttpStatus: 404,
      responsePagePath: "/404.html",
      ttl: Duration.seconds(10),
    });

    // WAF is included at $0 on the Free flat-rate plan; on pay-as-you-go it would be ~$6/mo (R8.3).
    const webAcl = config.flatRatePlan
      ? this.rateLimitWebAcl(config.rateLimitPer5Minutes)
      : undefined;

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      comment: config.domainName,
      domainNames: [config.domainName, wwwName],
      certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2025,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      enableIpv6: true,
      enableLogging: false,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          { function: viewerRequest, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
          { function: viewerResponse, eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE },
        ],
      },
      errorResponses: [notFound(403), notFound(404)],
      webAclId: webAcl?.attrArn,
    });

    // No deleteExisting: a clashing record fails the deploy instead of being overwritten (R1.7).
    const alias = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
    for (const [id, recordName] of [
      ["Apex", config.domainName],
      ["Www", wwwName],
    ] as const) {
      new route53.ARecord(this, `${id}ARecord`, { zone, recordName, target: alias });
      new route53.AaaaRecord(this, `${id}AaaaRecord`, { zone, recordName, target: alias });
    }
    new route53.CaaAmazonRecord(this, "CaaAmazonRecord", { zone });

    this.publishSite(bucket, distribution, config.siteDir, manifest);

    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "DistributionDomainName", { value: distribution.distributionDomainName });
    new CfnOutput(this, "BucketName", { value: bucket.bucketName });

    if (webAcl) {
      // L1: PricingPlanManager has no L2. A rejected subscription fails and rolls back the deploy (R8.4).
      const subscription = new pricingplanmanager.CfnSubscription(
        this,
        "FlatRatePlanSubscription",
        {
          planFamily: "CloudFront",
          planTier: "FREE",
          usageLevel: "DEFAULT",
          resourceArns: [distribution.distributionArn, webAcl.attrArn, zone.hostedZoneArn],
        },
      );
      new CfnOutput(this, "SubscriptionStatus", { value: subscription.attrStatus });
    }

    // L1: Budgets has no L2. Budgets alert; they do not cap spend (R9).
    const subscribers = [{ subscriptionType: "EMAIL", address: config.budgetEmail }];
    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: config.monthlyBudgetUsd, unit: "USD" },
      },
      notificationsWithSubscribers: [
        { type: "ACTUAL", threshold: 80 },
        { type: "FORECASTED", threshold: 100 },
      ].map(({ type, threshold }) => ({
        notification: {
          notificationType: type,
          comparisonOperator: "GREATER_THAN",
          threshold,
          thresholdType: "PERCENTAGE",
        },
        subscribers,
      })),
      // CfnBudget isn't ITaggable, so Tags.of(app) doesn't reach it.
      resourceTags: [PROJECT_TAG],
    });
  }

  /**
   * One BucketDeployment per publish group, all from the same asset. `pages` runs last and
   * invalidates /* and waits, so the deploy succeeds only once edges serve the new pages (R3.3).
   */
  private publishSite(
    bucket: s3.IBucket,
    distribution: cloudfront.IDistribution,
    siteDir: string,
    manifest: SiteManifest,
  ): void {
    const source = s3deploy.Source.asset(siteDir);
    const logGroup = new logs.LogGroup(this, "PublishLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
    });

    const deployments = publishGroups(manifest.scriptHashes).map((group) => {
      const isPages = group.id === "pages";
      return new s3deploy.BucketDeployment(this, `Publish-${group.id}`, {
        sources: [source],
        destinationBucket: bucket,
        exclude: group.exclude,
        include: group.include,
        prune: group.prune,
        cacheControl: [s3deploy.CacheControl.fromString(group.cacheControl)],
        contentType: group.contentType,
        metadata: group.metadata,
        logGroup,
        distribution: isPages ? distribution : undefined,
        distributionPaths: isPages ? ["/*"] : undefined,
      });
    });

    const [assets, ...rest] = deployments;
    const pages = rest.pop();
    if (!assets || !pages)
      throw new Error("publishGroups must start with assets and end with pages.");
    for (const deployment of rest) deployment.node.addDependency(assets);
    pages.node.addDependency(assets, ...rest);
  }

  /** L1: WAFv2 has no L2. One IP rate-based rule, blocking over-limit IPs per 5 minutes (R8.2). */
  private rateLimitWebAcl(limit: number): wafv2.CfnWebACL {
    const visibility = (metricName: string) => ({
      cloudWatchMetricsEnabled: true,
      sampledRequestsEnabled: true,
      metricName,
    });
    return new wafv2.CfnWebACL(this, "RateLimitWebAcl", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: visibility("site-web-acl"),
      rules: [
        {
          name: "rate-limit-per-ip",
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: { aggregateKeyType: "IP", limit, evaluationWindowSec: 300 },
          },
          visibilityConfig: visibility("rate-limit-per-ip"),
        },
      ],
    });
  }
}
