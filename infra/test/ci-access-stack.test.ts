import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { CiAccessStack } from "../src/ci-access-stack.ts";
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

  it("outputs the role ARN for the GitHub variable", () => {
    template.hasOutput("DeployRoleArn", {
      Value: { "Fn::GetAtt": [Match.stringLikeRegexp("^GitHubDeployRole"), "Arn"] },
    });
  });
});
