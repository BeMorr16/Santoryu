import { CfnOutput, DefaultStackSynthesizer, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import type { SiteConfig } from "./config.ts";

const GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";
const STS_AUDIENCE = "sts.amazonaws.com";

/**
 * The services SiteStack's resources need, by CloudFormation namespace: `AWS::<namespace>::*`. A
 * test fails when SiteStack gains a resource type outside this list, so a new resource can't
 * quietly break a deploy (contact-form R17.1).
 */
export const siteStackServices: Readonly<Record<string, readonly string[]>> = {
  Budgets: ["budgets"],
  CertificateManager: ["acm"],
  CloudFront: ["cloudfront"],
  CloudWatch: ["cloudwatch"],
  Events: ["events"],
  Lambda: ["lambda"],
  Logs: ["logs"],
  PricingPlanManager: ["pricingplanmanager"],
  Route53: ["route53"],
  S3: ["s3"],
  SES: ["ses"],
  SNS: ["sns"],
  WAFv2: ["wafv2"],
};

/** Single reads the resource handlers make, per their CloudFormation schemas. */
const handlerReads = [
  "billing:GetBillingViewData", // Budgets
  "payments:GetConnectedAccount", // WAF
  "shield:ListProtections", // PricingPlanManager
];

export const executionPolicyDescription =
  "What CloudFormation may do when deploying SiteStack, replacing bootstrap's AdministratorAccess.";

export interface CiAccessStackProps extends StackProps {
  config: Pick<SiteConfig, "githubRepository" | "githubOidcSubject">;
}

/**
 * GitHub Actions OIDC provider, the deploy role (static-hosting design §7.2) and the CDK execution
 * policy (contact-form design §12). Deployed by the owner; CI only deploys SiteStack, and once
 * bootstrap uses this policy, CI can't change this stack.
 */
export class CiAccessStack extends Stack {
  constructor(scope: Construct, id: string, props: CiAccessStackProps) {
    super(scope, id, props);
    const { githubRepository, githubOidcSubject } = props.config;

    const provider = new iam.OidcProviderNative(this, "GitHubOidcProvider", {
      url: `https://${GITHUB_OIDC_HOST}`,
      clientIds: [STS_AUDIENCE],
    });

    const role = new iam.Role(this, "GitHubDeployRole", {
      description: `Assumed by GitHub Actions (${githubRepository}, ${githubOidcSubject}) to deploy with CDK.`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${GITHUB_OIDC_HOST}:aud`]: STS_AUDIENCE,
          [`${GITHUB_OIDC_HOST}:sub`]: `repo:${githubRepository}:${githubOidcSubject}`,
        },
      }),
    });

    // Only the CDK bootstrap roles; they hold the deploy permissions (decision 0005, C).
    const synthesizer = this.synthesizer;
    const qualifier =
      (synthesizer instanceof DefaultStackSynthesizer
        ? synthesizer.bootstrapQualifier
        : undefined) ?? DefaultStackSynthesizer.DEFAULT_QUALIFIER;
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["deploy", "file-publishing", "lookup"].map((kind) =>
          this.formatArn({
            service: "iam",
            region: "",
            resource: "role",
            resourceName: `cdk-${qualifier}-${kind}-role-${this.account}-${this.region}`,
          }),
        ),
      }),
    );

    const siteStackRoles = this.formatArn({
      service: "iam",
      region: "",
      resource: "role",
      resourceName: "SiteStack-*",
    });
    const executionPolicy = new iam.ManagedPolicy(this, "SiteStackExecutionPolicy", {
      description: executionPolicyDescription,
      statements: [
        new iam.PolicyStatement({
          actions: Object.values(siteStackServices).flatMap((services) =>
            services.map((service) => `${service}:*`),
          ),
          resources: ["*"],
        }),
        new iam.PolicyStatement({ actions: handlerReads, resources: ["*"] }),
        new iam.PolicyStatement({
          actions: [
            "iam:AttachRolePolicy",
            "iam:CreateRole",
            "iam:DeleteRole",
            "iam:DeleteRolePolicy",
            "iam:DetachRolePolicy",
            "iam:GetRole",
            "iam:GetRolePolicy",
            "iam:ListAttachedRolePolicies",
            "iam:ListRolePolicies",
            "iam:PutRolePolicy",
            "iam:TagRole",
            "iam:UntagRole",
            "iam:UpdateAssumeRolePolicy",
            "iam:UpdateRole",
            "iam:UpdateRoleDescription",
          ],
          resources: [siteStackRoles],
        }),
        // Only to Lambda: no other resource in SiteStack takes a role.
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          resources: [siteStackRoles],
          conditions: { StringEquals: { "iam:PassedToService": "lambda.amazonaws.com" } },
        }),
        // The bootstrap version check in every CDK template.
        new iam.PolicyStatement({
          actions: ["ssm:GetParameter", "ssm:GetParameters"],
          resources: [
            this.formatArn({
              service: "ssm",
              resource: "parameter",
              resourceName: "cdk-bootstrap/*",
            }),
          ],
        }),
      ],
    });

    new CfnOutput(this, "ExecutionPolicyArn", {
      value: executionPolicy.managedPolicyArn,
      description: "Pass to cdk bootstrap --cloudformation-execution-policies.",
    });

    new CfnOutput(this, "DeployRoleArn", {
      value: role.roleArn,
      description: "Set as the GitHub production environment secret AWS_DEPLOY_ROLE_ARN.",
    });
  }
}
