import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { defineApp } from "../src/app.ts";
import { CiAccessStack, siteStackServices } from "../src/ci-access-stack.ts";
import { readSiteManifest } from "../src/site-manifest.ts";
import { testApp, testConfig, testEnv } from "./stack-harness.ts";

let template: Template;

beforeAll(() => {
  const stack = new CiAccessStack(testApp(), "CiAccessStack", { env: testEnv, config: testConfig });
  template = Template.fromStack(stack);
});

describe("CiAccessStack", () => {
  it("creates one native GitHub OIDC provider for the STS audience", () => {
    template.resourceCountIs("AWS::IAM::OIDCProvider", 1);
    template.hasResourceProperties("AWS::IAM::OIDCProvider", {
      Url: "https://token.actions.githubusercontent.com",
      ClientIdList: ["sts.amazonaws.com"],
    });
    template.resourceCountIs("Custom::AWSCDKOpenIdConnectProvider", 0);
  });

  it("trusts only web-identity tokens for the repo's production environment (R6.5)", () => {
    template.resourceCountIs("AWS::IAM::Role", 1);
    const role = Object.values(template.findResources("AWS::IAM::Role"))[0] as {
      Properties: {
        AssumeRolePolicyDocument: { Statement: unknown[] };
        MaxSessionDuration: number;
      };
    };
    expect(role.Properties.MaxSessionDuration).toBe(3600);
    expect(role.Properties.AssumeRolePolicyDocument.Statement).toEqual([
      {
        Action: "sts:AssumeRoleWithWebIdentity",
        Effect: "Allow",
        Principal: { Federated: { Ref: expect.stringMatching(/^GitHubOidcProvider/) as unknown } },
        Condition: {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": "repo:owner/fake:environment:production",
          },
        },
      },
    ]);
  });

  it("puts an immutable owner@id/repo@id repository into the sub condition unchanged", () => {
    const stack = new CiAccessStack(testApp(), "CiAccessStack", {
      env: testEnv,
      config: { ...testConfig, githubRepository: "owner@123/fake@456" },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Condition: {
              StringEquals: Match.objectLike({
                "token.actions.githubusercontent.com:sub":
                  "repo:owner@123/fake@456:environment:production",
              }),
            },
          }),
        ],
      },
    });
  });

  it("lets the role do nothing but assume this account's CDK bootstrap roles", () => {
    const policies = Object.values(template.findResources("AWS::IAM::Policy")) as {
      Properties: { PolicyDocument: { Statement: unknown[] } };
    }[];
    expect(policies).toHaveLength(1);
    const roleArn = (kind: string) =>
      `arn:aws:iam::111111111111:role/cdk-hnb659fds-${kind}-role-111111111111-us-east-1`;
    expect(policies[0]?.Properties.PolicyDocument.Statement).toEqual([
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Resource: [roleArn("deploy"), roleArn("file-publishing"), roleArn("lookup")],
      },
    ]);
    template.resourcePropertiesCountIs(
      "AWS::IAM::Role",
      { ManagedPolicyArns: Match.anyValue() },
      0,
    );
  });

  it("outputs the role ARN for the GitHub secret", () => {
    template.hasOutput("DeployRoleArn", {
      Value: { "Fn::GetAtt": [Match.stringLikeRegexp("^GitHubDeployRole"), "Arn"] },
    });
  });
});

describe("CiAccessStack: the CDK execution policy (contact-form R17.1)", () => {
  type Statement = {
    Action: string | string[];
    Resource: string | string[];
    Condition?: unknown;
  };

  const statements = () => {
    const policies = Object.values(template.findResources("AWS::IAM::ManagedPolicy")) as {
      Properties: { PolicyDocument: { Statement: Statement[] } };
    }[];
    expect(policies).toHaveLength(1);
    return policies[0]?.Properties.PolicyDocument.Statement ?? [];
  };
  const actionsOf = (statement: Statement) => [statement.Action].flat();
  const iamStatements = () =>
    statements().filter((statement) =>
      actionsOf(statement).some((action) => action.startsWith("iam:")),
    );

  it("isn't attached to the deploy role: bootstrap gives it to CloudFormation's role", () => {
    template.resourcePropertiesCountIs(
      "AWS::IAM::Role",
      { ManagedPolicyArns: Match.anyValue() },
      0,
    );
    template.hasOutput("ExecutionPolicyArn", {
      Value: { Ref: Match.stringLikeRegexp("^SiteStackExecutionPolicy") },
    });
  });

  it("isn't AdministratorAccess: no `*` action, and no wildcard on the powerful services", () => {
    const actions = statements().flatMap(actionsOf);

    expect(actions).not.toContain("*");
    for (const service of ["iam", "sts", "organizations", "account", "kms", "secretsmanager"]) {
      expect(actions, service).not.toContain(`${service}:*`);
    }
    expect(actions.filter((action) => action.startsWith("ssm:"))).toEqual([
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]);
    expect(actions).not.toContainEqual(expect.stringMatching(/^(iam|ssm):.*\*/));
  });

  it("limits IAM to roles named SiteStack-*", () => {
    const iam = iamStatements();

    expect(iam.length).toBeGreaterThan(0);
    for (const statement of iam) {
      expect(statement.Resource).toBe("arn:aws:iam::111111111111:role/SiteStack-*");
    }
  });

  it("can't create or change users, groups or managed policies", () => {
    const actions = iamStatements().flatMap(actionsOf);

    expect(actions).not.toContainEqual(expect.stringMatching(/User|Group|CreatePolicy|AccessKey/));
  });

  it("passes roles only to Lambda", () => {
    const passRole = iamStatements().filter((statement) =>
      actionsOf(statement).includes("iam:PassRole"),
    );

    expect(passRole).toHaveLength(1);
    expect(actionsOf(passRole[0] as Statement)).toEqual(["iam:PassRole"]);
    expect(passRole[0]?.Condition).toEqual({
      StringEquals: { "iam:PassedToService": "lambda.amazonaws.com" },
    });
  });

  it("reads SSM only for bootstrap's version parameter", () => {
    const ssm = statements().filter((statement) =>
      actionsOf(statement).some((action) => action.startsWith("ssm:")),
    );

    expect(ssm).toHaveLength(1);
    expect(ssm[0]?.Resource).toBe("arn:aws:ssm:us-east-1:111111111111:parameter/cdk-bootstrap/*");
  });

  it("includes the single reads the resource handlers need beyond their own service", () => {
    const actions = statements().flatMap(actionsOf);

    expect(actions).toEqual(
      expect.arrayContaining([
        "billing:GetBillingViewData",
        "payments:GetConnectedAccount",
        "shield:ListProtections",
      ]),
    );
    expect(actions).not.toContain("billing:*");
    expect(actions).not.toContain("payments:*");
    expect(actions).not.toContain("shield:*");
  });

  it.each([false, true])(
    "covers every resource type in SiteStack, with flatRatePlan %s",
    (flatRatePlan) => {
      const { site } = defineApp(testApp(), {
        config: { ...testConfig, flatRatePlan },
        manifest: readSiteManifest(testConfig.siteManifest, testConfig.siteDir),
        account: testEnv.account,
      });
      const resources = Template.fromStack(site).toJSON().Resources as Record<
        string,
        { Type: string }
      >;
      const actions = new Set(statements().flatMap(actionsOf));
      // IAM is scoped by name above, CDK::Metadata needs nothing, and a custom resource is a
      // Lambda invocation.
      const handled = new Set(["IAM", "CDK"]);

      for (const { Type: type } of Object.values(resources)) {
        if (type.startsWith("Custom::")) {
          expect(actions, type).toContain("lambda:*");
          continue;
        }
        const namespace = type.split("::")[1] ?? "";
        if (handled.has(namespace)) continue;
        const services = siteStackServices[namespace];
        expect(services, `${type} needs an entry in siteStackServices`).toBeDefined();
        for (const service of services ?? []) {
          expect(actions, type).toContain(`${service}:*`);
        }
      }
    },
  );
});
