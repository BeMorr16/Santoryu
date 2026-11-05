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

/** A fixed name, so SiteStack can name it without a cross-stack reference, which CI would deploy. */
export const ROLE_BOUNDARY_NAME = "SiteStack-RoleBoundary";

export const executionPolicyDescription =
  "What CloudFormation may do when deploying SiteStack, replacing bootstrap's AdministratorAccess.";

export interface CiAccessStackProps extends StackProps {
  config: Pick<SiteConfig, "githubRepository" | "githubOidcSubject">;
}

/**
 * GitHub Actions OIDC provider, the deploy role (static-hosting design §7.2), and the CDK execution
 * policy and role boundary (contact-form design §12). Deployed by the owner. CI only deploys
 * SiteStack, and once bootstrap uses the execution policy, a change reaching the pipeline can't
 * create a role beyond the boundary, or change this stack.
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
    const boundaryArn = this.formatArn({
      service: "iam",
      region: "",
      resource: "policy",
      resourceName: ROLE_BOUNDARY_NAME,
    });

    // A ceiling, not a grant: a SiteStack role's real permissions are what it's granted within this.
    // Without it, a role named SiteStack-x could still be given AdministratorAccess.
    new iam.ManagedPolicy(this, "SiteStackRoleBoundary", {
      managedPolicyName: ROLE_BOUNDARY_NAME,
      description: "The most any role in SiteStack can do, whatever it's granted.",
      statements: [
        new iam.PolicyStatement({
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: ["ses:SendEmail", "ses:SendRawEmail"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "ssm:DescribeParameters",
            "ssm:GetParameter",
            "ssm:GetParameterHistory",
            "ssm:GetParameters",
          ],
          resources: [
            this.formatArn({
              service: "ssm",
              resource: "parameter",
              resourceName: "personal-site/*",
            }),
          ],
        }),
        // The site's bucket, and the CDK staging bucket the build is read from.
        new iam.PolicyStatement({
          actions: [
            "s3:Abort*",
            "s3:DeleteObject*",
            "s3:GetBucket*",
            "s3:GetObject*",
            "s3:List*",
            "s3:PutObject*",
          ],
          resources: ["sitestack-*", "cdk-*"].flatMap((bucket) => [
            `arn:${this.partition}:s3:::${bucket}`,
            `arn:${this.partition}:s3:::${bucket}/*`,
          ]),
        }),
        new iam.PolicyStatement({
          actions: ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
          resources: ["*"],
        }),
        // AWS-managed keys on the staging bucket and the Turnstile parameter, through those services.
        new iam.PolicyStatement({
          actions: ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey*"],
          resources: ["*"],
          conditions: {
            StringEquals: {
              "kms:ViaService": [
                `s3.${this.region}.amazonaws.com`,
                `ssm.${this.region}.amazonaws.com`,
              ],
            },
          },
        }),
      ],
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
        // These can give a role power, so the role must carry the boundary. There's no action to
        // remove it, and none to change the boundary policy itself.
        new iam.PolicyStatement({
          actions: [
            "iam:AttachRolePolicy",
            "iam:CreateRole",
            "iam:DeleteRolePolicy",
            "iam:DetachRolePolicy",
            "iam:PutRolePermissionsBoundary",
            "iam:PutRolePolicy",
          ],
          resources: [siteStackRoles],
          conditions: { StringEquals: { "iam:PermissionsBoundary": boundaryArn } },
        }),
        new iam.PolicyStatement({
          actions: [
            "iam:DeleteRole",
            "iam:GetRole",
            "iam:GetRolePolicy",
            "iam:ListAttachedRolePolicies",
            "iam:ListRolePolicies",
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
