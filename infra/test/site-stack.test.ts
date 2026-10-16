import { readFileSync } from "node:fs";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { defineApp } from "../src/app.ts";
import type { SiteConfig } from "../src/config.ts";
import { renderViewerRequest, renderViewerResponse } from "../src/edge-functions.ts";
import { readSiteManifest } from "../src/site-manifest.ts";
import { testApp, testConfig, testEnv } from "./stack-harness.ts";

const manifest = readSiteManifest(testConfig.siteManifest, testConfig.siteDir);

function synthSite(overrides: Partial<SiteConfig> = {}): Template {
  const { site } = defineApp(testApp(), {
    config: { ...testConfig, ...overrides },
    manifest,
    account: testEnv.account,
  });
  return Template.fromStack(site);
}

type Resource = { Type: string; Properties?: Record<string, unknown> };

function only(template: Template, type: string): Resource {
  const resources = Object.values(template.findResources(type)) as Resource[];
  expect(resources, type).toHaveLength(1);
  return resources[0] as Resource;
}

let template: Template;

beforeAll(() => {
  template = synthSite();
});

describe("SiteStack: origin bucket (R2.7, R5.2, R5.3)", () => {
  it("blocks public access, encrypts with SSE-S3 and enforces bucket-owner object ownership", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
      OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
      LifecycleConfiguration: {
        Rules: [Match.objectLike({ AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 } })],
      },
    });
  });

  it("is retained when the stack is deleted or the bucket replaced", () => {
    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
  });

  it("is not versioned (content is reproducible from git)", () => {
    expect(only(template, "AWS::S3::Bucket").Properties).not.toHaveProperty(
      "VersioningConfiguration",
    );
  });

  it("denies non-TLS and pre-TLS-1.2 requests, and allows reads only to this distribution", () => {
    const policy = only(template, "AWS::S3::BucketPolicy").Properties as {
      PolicyDocument: { Statement: Record<string, unknown>[] };
    };
    const statements = policy.PolicyDocument.Statement;

    expect(statements).toContainEqual(
      expect.objectContaining({
        Effect: "Deny",
        Action: "s3:*",
        Principal: { AWS: "*" },
        Condition: { Bool: { "aws:SecureTransport": "false" } },
      }),
    );
    expect(statements).toContainEqual(
      expect.objectContaining({
        Effect: "Deny",
        Action: "s3:*",
        Principal: { AWS: "*" },
        Condition: { NumericLessThan: { "s3:TlsVersion": 1.2 } },
      }),
    );

    const allows = statements.filter((statement) => statement.Effect === "Allow");
    expect(allows).toHaveLength(1);
    expect(allows[0]).toMatchObject({
      Action: "s3:GetObject",
      Principal: { Service: "cloudfront.amazonaws.com" },
      Condition: { StringEquals: { "AWS:SourceArn": expect.anything() as unknown } },
    });
    expect(JSON.stringify(allows[0])).toMatch(/distribution\/.*SiteDistribution/);
  });

  it("is reached through Origin Access Control with SigV4", () => {
    template.hasResourceProperties("AWS::CloudFront::OriginAccessControl", {
      OriginAccessControlConfig: Match.objectLike({
        OriginAccessControlOriginType: "s3",
        SigningBehavior: "always",
        SigningProtocol: "sigv4",
      }),
    });
  });
});

describe("SiteStack: certificate (R1.1)", () => {
  it("covers the apex and www, validated by DNS in the imported zone", () => {
    template.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: "example.test",
      SubjectAlternativeNames: ["www.example.test"],
      ValidationMethod: "DNS",
      DomainValidationOptions: Match.arrayWith([
        { DomainName: "example.test", HostedZoneId: "Z0FAKEZONE00000000000" },
        { DomainName: "www.example.test", HostedZoneId: "Z0FAKEZONE00000000000" },
      ]),
    });
  });

  it("does not create or look up a hosted zone", () => {
    template.resourceCountIs("AWS::Route53::HostedZone", 0);
  });
});

describe("SiteStack: distribution (R1.2–R1.4, R1.9, R2.6, R3)", () => {
  const config = () =>
    (
      only(template, "AWS::CloudFront::Distribution").Properties as {
        DistributionConfig: Record<string, unknown> & {
          DefaultCacheBehavior: Record<string, unknown>;
        };
      }
    ).DistributionConfig;

  it("serves the apex and www over TLS 1.2+ (TLSv1.2_2025), HTTP/2 and 3, and IPv6", () => {
    expect(config()).toMatchObject({
      Aliases: ["example.test", "www.example.test"],
      ViewerCertificate: {
        MinimumProtocolVersion: "TLSv1.2_2025",
        SslSupportMethod: "sni-only",
      },
      HttpVersion: "http2and3",
      IPV6Enabled: true,
      Enabled: true,
    });
  });

  it("has one behavior: HTTPS redirect, GET/HEAD only, CachingOptimized, compression", () => {
    expect(config()).not.toHaveProperty("CacheBehaviors");
    expect(config().DefaultCacheBehavior).toMatchObject({
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: ["GET", "HEAD"],
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
      Compress: true,
    });
  });

  it("runs the viewer-request and viewer-response functions on the default behavior", () => {
    const associations = config().DefaultCacheBehavior.FunctionAssociations as {
      EventType: string;
      FunctionARN: { "Fn::GetAtt": [string, string] };
    }[];
    expect(associations.map((association) => association.EventType).sort()).toEqual([
      "viewer-request",
      "viewer-response",
    ]);
  });

  it("maps origin 403/404 to /404.html with status 404 and a 10-second error TTL", () => {
    expect(config().CustomErrorResponses).toEqual([
      { ErrorCode: 403, ResponseCode: 404, ResponsePagePath: "/404.html", ErrorCachingMinTTL: 10 },
      { ErrorCode: 404, ResponseCode: 404, ResponsePagePath: "/404.html", ErrorCachingMinTTL: 10 },
    ]);
  });

  it("has no access logging and, with the plan flag off, no web ACL", () => {
    expect(config()).not.toHaveProperty("Logging");
    expect(config()).not.toHaveProperty("WebACLId");
  });
});

describe("SiteStack: edge functions (R2, R4)", () => {
  const functions = () =>
    Object.values(template.findResources("AWS::CloudFront::Function")) as {
      Properties: { FunctionCode: string; FunctionConfig: { Runtime: string } };
    }[];

  it("deploys the rendered viewer-request and viewer-response code on cloudfront-js-2.0", () => {
    const codes = functions().map((fn) => fn.Properties.FunctionCode);
    expect(codes).toHaveLength(2);
    expect(codes).toContain(
      renderViewerRequest({ apex: testConfig.domainName, files: manifest.files }),
    );
    expect(codes).toContain(renderViewerResponse());
    for (const fn of functions()) {
      expect(fn.Properties.FunctionConfig.Runtime).toBe("cloudfront-js-2.0");
      expect(fn.Properties.FunctionConfig).not.toHaveProperty("KeyValueStoreAssociations");
    }
  });
});

describe("SiteStack: DNS (R1.5–R1.7)", () => {
  it.each(["A", "AAAA"])("aliases the apex and www to the distribution with %s records", (type) => {
    for (const name of ["example.test.", "www.example.test."]) {
      template.hasResourceProperties("AWS::Route53::RecordSet", {
        Name: name,
        Type: type,
        HostedZoneId: "Z0FAKEZONE00000000000",
        AliasTarget: {
          DNSName: { "Fn::GetAtt": [Match.stringLikeRegexp("^SiteDistribution"), "DomainName"] },
          HostedZoneId: Match.anyValue(),
        },
      });
    }
  });

  it('allows only Amazon to issue certificates: CAA 0 issue "amazon.com"', () => {
    template.hasResourceProperties("AWS::Route53::RecordSet", {
      Name: "example.test.",
      Type: "CAA",
      HostedZoneId: "Z0FAKEZONE00000000000",
      ResourceRecords: ['0 issue "amazon.com"'],
    });
  });

  it("creates only those five records and never deletes existing ones", () => {
    template.resourceCountIs("AWS::Route53::RecordSet", 5);
    template.resourceCountIs("Custom::DeleteExistingRecordSet", 0);
  });
});

describe.each([false, true])("tags and region with flatRatePlan %s (R5.6)", (flatRatePlan) => {
  const projectTag = { Key: "project", Value: "personal-site" };
  // Every resource type in either stack that supports tags. Records, OAC, bucket policy, IAM
  // policies, layers and custom resources have no Tags property in CloudFormation.
  const taggable = new Set([
    "AWS::S3::Bucket",
    "AWS::CertificateManager::Certificate",
    "AWS::CloudFront::Distribution",
    "AWS::CloudFront::Function",
    "AWS::Lambda::Function",
    "AWS::IAM::Role",
    "AWS::Logs::LogGroup",
    "AWS::IAM::OIDCProvider",
    "AWS::WAFv2::WebACL",
  ]);

  it("tags every taggable resource in both stacks project=personal-site, in us-east-1", () => {
    const { site, ciAccess } = defineApp(testApp(), {
      config: { ...testConfig, flatRatePlan },
      manifest,
      account: testEnv.account,
    });
    for (const stack of [site, ciAccess]) {
      expect(stack.region).toBe("us-east-1");
      const resources = Object.values(
        Template.fromStack(stack).toJSON().Resources as Record<string, Resource>,
      );
      for (const resource of resources.filter((r) => taggable.has(r.Type))) {
        expect(resource.Properties?.Tags, resource.Type).toContainEqual(projectTag);
      }
    }
    const budget = only(Template.fromStack(site), "AWS::Budgets::Budget");
    expect(budget.Properties?.ResourceTags).toEqual([projectTag]);
  });
});

describe("SiteStack: publish groups (R3.1–R3.5, R6.3)", () => {
  type Deployment = {
    Properties: Record<string, unknown>;
    DependsOn?: string[];
  };
  const deployments = () =>
    template.findResources("Custom::CDKBucketDeployment") as Record<string, Deployment>;
  const group = (id: string): [string, Deployment] => {
    const entry = Object.entries(deployments()).find(([logicalId]) =>
      logicalId.startsWith(`Publish${id.replace("-", "")}CustomResource`),
    );
    if (!entry) throw new Error(`No publish group ${id}`);
    return entry;
  };

  const revalidate = "public, max-age=0, must-revalidate";
  const html = "text/html; charset=utf-8";
  const hashes = manifest.scriptHashes.join(" ");

  it("has five groups, all from the same uploaded build", () => {
    const all = Object.values(deployments());
    expect(all).toHaveLength(5);
    const sources = new Set(
      all.map((deployment) => JSON.stringify(deployment.Properties.SourceObjectKeys)),
    );
    expect(sources.size).toBe(1);
  });

  it.each([
    [
      "assets",
      ["*"],
      ["assets/*"],
      false,
      { "cache-control": "public, max-age=31536000, immutable" },
      {},
    ],
    [
      "pages",
      ["*"],
      ["index.html", "*/index.html"],
      true,
      { "cache-control": revalidate, "content-type": html },
      { "csp-script-hashes": hashes },
    ],
    [
      "not-found",
      ["*"],
      ["404.html"],
      true,
      { "cache-control": revalidate, "content-type": html },
      { "csp-script-hashes": hashes, "site-status": "404" },
    ],
    [
      "xml",
      ["*"],
      ["*.xml"],
      true,
      { "cache-control": revalidate, "content-type": "application/xml" },
      {},
    ],
    [
      "other",
      ["assets/*", "*.html", "*.xml"],
      undefined,
      true,
      { "cache-control": revalidate },
      {},
    ],
  ] as const)(
    "%s: exclude %j, include %j, prune %s, with its system and user metadata",
    (id, exclude, include, prune, systemMetadata, userMetadata) => {
      const properties = group(id)[1].Properties;
      expect(properties.Exclude).toEqual(exclude);
      expect(properties.Include).toEqual(include);
      expect(properties.Prune).toBe(prune);
      expect(properties.SystemMetadata).toEqual(systemMetadata);
      expect(properties.UserMetadata).toEqual(userMetadata);
    },
  );

  it("invalidates /* and waits for it only from pages, after the other four groups", () => {
    const [, pages] = group("pages");
    expect(pages.Properties).toMatchObject({
      DistributionId: { Ref: expect.stringMatching(/^SiteDistribution/) as unknown },
      DistributionPaths: ["/*"],
      WaitForDistributionInvalidation: true,
    });
    for (const id of ["assets", "not-found", "xml", "other"]) {
      const [logicalId, deployment] = group(id);
      expect(pages.DependsOn, id).toContain(logicalId);
      expect(deployment.Properties).not.toHaveProperty("DistributionId");
    }
  });

  it("uploads assets before any other group", () => {
    const [assetsId, assets] = group("assets");
    expect(assets.DependsOn ?? []).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/CustomResource/)]),
    );
    for (const id of ["pages", "not-found", "xml", "other"]) {
      expect(group(id)[1].DependsOn, id).toContain(assetsId);
    }
  });

  it("runs one shared handler that logs to a group kept for one month", () => {
    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 30 });
    template.hasResourceProperties("AWS::Lambda::Function", {
      LoggingConfig: { LogGroup: { Ref: Match.stringLikeRegexp("^PublishLogGroup") } },
    });
  });
});

describe("SiteStack: flat-rate plan flag on (R8.1, R8.2)", () => {
  let flagOn: Template;

  beforeAll(() => {
    flagOn = synthSite({ flatRatePlan: true, rateLimitPer5Minutes: 750 });
  });

  it("creates a CloudFront-scope web ACL that allows by default and blocks per-IP floods", () => {
    flagOn.resourceCountIs("AWS::WAFv2::WebACL", 1);
    flagOn.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
      DefaultAction: { Allow: {} },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
        MetricName: Match.anyValue(),
      },
      Rules: [
        {
          Name: "rate-limit-per-ip",
          Priority: 0,
          Action: { Block: {} },
          Statement: {
            RateBasedStatement: { AggregateKeyType: "IP", Limit: 750, EvaluationWindowSec: 300 },
          },
          VisibilityConfig: {
            CloudWatchMetricsEnabled: true,
            SampledRequestsEnabled: true,
            MetricName: Match.anyValue(),
          },
        },
      ],
    });
  });

  it("attaches the web ACL to the distribution", () => {
    flagOn.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        WebACLId: { "Fn::GetAtt": [Match.stringLikeRegexp("^RateLimitWebAcl"), "Arn"] },
      }),
    });
  });

  it("subscribes the distribution, web ACL and hosted zone to the Free plan", () => {
    flagOn.resourceCountIs("AWS::PricingPlanManager::Subscription", 1);
    flagOn.hasResourceProperties("AWS::PricingPlanManager::Subscription", {
      PlanFamily: "CloudFront",
      PlanTier: "FREE",
      UsageLevel: "DEFAULT",
      ResourceArns: [
        Match.anyValue(),
        { "Fn::GetAtt": [Match.stringLikeRegexp("^RateLimitWebAcl"), "Arn"] },
        Match.anyValue(),
      ],
    });
    const subscription = Object.values(
      flagOn.findResources("AWS::PricingPlanManager::Subscription"),
    )[0] as {
      Properties: { ResourceArns: unknown[] };
    };
    const [distributionArn, , zoneArn] = subscription.Properties.ResourceArns.map((arn) =>
      JSON.stringify(arn),
    );
    expect(distributionArn).toMatch(/cloudfront::111111111111:distribution\/.*SiteDistribution/);
    expect(zoneArn).toContain("route53:::hostedzone/Z0FAKEZONE00000000000");
  });

  it("outputs the subscription status", () => {
    flagOn.hasOutput("SubscriptionStatus", {
      Value: { "Fn::GetAtt": [Match.stringLikeRegexp("^FlatRatePlanSubscription"), "Status"] },
    });
  });
});

describe("SiteStack: flat-rate plan flag off (R8.3)", () => {
  it("creates no WAF resources, no subscription and no web ACL association", () => {
    expect(
      Object.values(template.toJSON().Resources as Record<string, Resource>).filter(
        (resource) =>
          resource.Type.startsWith("AWS::WAFv2::") ||
          resource.Type.startsWith("AWS::PricingPlanManager::"),
      ),
    ).toEqual([]);
    expect(template.findOutputs("SubscriptionStatus")).toEqual({});
  });
});

describe("SiteStack: budget (R9)", () => {
  it("emails at 80% of actual and 100% of forecast spend of a USD 5 monthly cost budget", () => {
    template.resourceCountIs("AWS::Budgets::Budget", 1);
    const subscriber = { SubscriptionType: "EMAIL", Address: "alerts@example.test" };
    template.hasResourceProperties("AWS::Budgets::Budget", {
      Budget: Match.objectLike({
        BudgetType: "COST",
        TimeUnit: "MONTHLY",
        BudgetLimit: { Amount: 5, Unit: "USD" },
      }),
      NotificationsWithSubscribers: [
        {
          Notification: {
            NotificationType: "ACTUAL",
            ComparisonOperator: "GREATER_THAN",
            Threshold: 80,
            ThresholdType: "PERCENTAGE",
          },
          Subscribers: [subscriber],
        },
        {
          Notification: {
            NotificationType: "FORECASTED",
            ComparisonOperator: "GREATER_THAN",
            Threshold: 100,
            ThresholdType: "PERCENTAGE",
          },
          Subscribers: [subscriber],
        },
      ],
    });
  });
});

describe.each([false, true])("safety checks with flatRatePlan %s", (flatRatePlan) => {
  let stacks: Template[];

  beforeAll(() => {
    const { site, ciAccess } = defineApp(testApp(), {
      config: { ...testConfig, flatRatePlan },
      manifest,
      account: testEnv.account,
    });
    stacks = [Template.fromStack(site), Template.fromStack(ciAccess)];
  });

  const site = () => stacks[0] as Template;
  const resources = (stack: Template) =>
    Object.values(stack.toJSON().Resources as Record<string, Resource>);

  it("is Free-plan compatible (R5.5)", () => {
    for (const type of [
      "AWS::CloudFront::CachePolicy",
      "AWS::CloudFront::OriginRequestPolicy",
      "AWS::CloudFront::ResponseHeadersPolicy",
      "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      "AWS::CloudFront::KeyValueStore",
      "AWS::CloudFront::RealtimeLogConfig",
    ]) {
      site().resourceCountIs(type, 0);
    }
    const distribution = only(site(), "AWS::CloudFront::Distribution").Properties as {
      DistributionConfig: { CacheBehaviors?: unknown[] };
    };
    expect(JSON.stringify(distribution)).not.toContain("ForwardedValues");
    expect(1 + (distribution.DistributionConfig.CacheBehaviors?.length ?? 0)).toBeLessThanOrEqual(
      5,
    );

    for (const acl of resources(site()).filter(
      (resource) => resource.Type === "AWS::WAFv2::WebACL",
    )) {
      const rules = (acl.Properties?.Rules ?? []) as unknown[];
      expect(rules.length).toBeLessThanOrEqual(5);
      expect(JSON.stringify(rules)).not.toMatch(
        /RuleGroupReferenceStatement|ManagedRuleGroupStatement/,
      );
    }
  });

  it("hard-codes no committed config values (R5.4)", () => {
    const cdkJson = JSON.parse(readFileSync(new URL("../cdk.json", import.meta.url), "utf8")) as {
      context: Record<string, string>;
    };
    const committed = [
      "ben-morrison",
      "BeMorr16",
      "Santoryu",
      "bemorrison",
      cdkJson.context["personal-site:domainName"],
      cdkJson.context["personal-site:hostedZoneId"],
      ...(cdkJson.context["personal-site:githubRepository"] ?? "").split(/[/@]/),
    ];
    for (const stack of stacks) {
      const json = JSON.stringify(stack.toJSON());
      for (const value of committed) {
        expect(json, value).not.toContain(value);
      }
    }
  });

  it("allows `*` resources only for the BucketDeployment invalidation statement (D3)", () => {
    type Statement = { Effect: string; Action: string | string[]; Resource: unknown };
    const statements = stacks.flatMap((stack) =>
      resources(stack).flatMap((resource) => {
        if (resource.Type === "AWS::IAM::Policy" || resource.Type === "AWS::IAM::ManagedPolicy") {
          return (resource.Properties?.PolicyDocument as { Statement: Statement[] }).Statement;
        }
        if (resource.Type === "AWS::IAM::Role") {
          const policies = (resource.Properties?.Policies ?? []) as {
            PolicyDocument: { Statement: Statement[] };
          }[];
          return policies.flatMap((policy) => policy.PolicyDocument.Statement);
        }
        return [];
      }),
    );
    expect(statements.length).toBeGreaterThan(0);

    const wildcard = statements.filter((statement) => [statement.Resource].flat().includes("*"));
    expect(wildcard).toEqual([
      {
        Effect: "Allow",
        Action: ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
        Resource: "*",
      },
    ]);
    for (const statement of statements) {
      for (const action of [statement.Action].flat()) {
        expect(action === "*" || action.endsWith(":*"), action).toBe(false);
      }
    }
  });
});
