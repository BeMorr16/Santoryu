import { CfnOutput, DefaultStackSynthesizer, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import type { SiteConfig } from "./config.ts";

const GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";
const STS_AUDIENCE = "sts.amazonaws.com";

export interface CiAccessStackProps extends StackProps {
  config: Pick<SiteConfig, "githubRepository" | "githubOidcSubject">;
}

/**
 * GitHub Actions OIDC provider and the deploy role (static-hosting design §7.2). Deployed once by
 * the owner; CI only deploys SiteStack. (With the default bootstrap policy this is a convention,
 * not an enforced boundary: decision 0005, C.)
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

    new CfnOutput(this, "DeployRoleArn", {
      value: role.roleArn,
      description: "Set as the GitHub production environment variable AWS_DEPLOY_ROLE_ARN.",
    });
  }
}
