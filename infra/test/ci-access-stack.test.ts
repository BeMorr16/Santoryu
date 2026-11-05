import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { defineApp } from "../src/app.ts";
import {
  CiAccessStack,
  executionPolicyDescription,
  ROLE_BOUNDARY_NAME,
  siteStackServices,
} from "../src/ci-access-stack.ts";
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

  type ManagedPolicy = {
    Properties: {
      Description: string;
      ManagedPolicyName?: string;
      PolicyDocument: { Statement: Statement[] };
    };
  };
  const managedPolicies = () =>
    Object.values(template.findResources("AWS::IAM::ManagedPolicy")) as ManagedPolicy[];
  const statements = () => {
    const policies = managedPolicies().filter(
      (policy) => policy.Properties.Description === executionPolicyDescription,
    );
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

  const boundaryArn = "arn:aws:iam::111111111111:policy/SiteStack-RoleBoundary";

  it.each([
    "iam:AttachRolePolicy",
    "iam:CreateRole",
    "iam:DeleteRolePolicy",
    "iam:DetachRolePolicy",
    "iam:PutRolePermissionsBoundary",
    "iam:PutRolePolicy",
  ])("requires the boundary for %s, so no role can exceed it", (action) => {
    const matching = iamStatements().filter((statement) => actionsOf(statement).includes(action));

    expect(matching).toHaveLength(1);
    expect(matching[0]?.Condition).toEqual({
      StringEquals: { "iam:PermissionsBoundary": boundaryArn },
    });
  });

  it("can't remove the boundary from a role, or change the boundary policy itself", () => {
    const actions = statements().flatMap(actionsOf);

    for (const action of [
      "iam:DeleteRolePermissionsBoundary",
      "iam:CreatePolicyVersion",
      "iam:SetDefaultPolicyVersion",
      "iam:DeletePolicy",
    ]) {
      expect(actions).not.toContain(action);
    }
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
      // IAM is covered above for these two types only, CDK::Metadata needs nothing, and a custom
      // resource is a Lambda invocation.
      const handled = new Set(["AWS::IAM::Role", "AWS::IAM::Policy", "AWS::CDK::Metadata"]);

      for (const { Type: type } of Object.values(resources)) {
        if (type.startsWith("Custom::")) {
          expect(actions, type).toContain("lambda:*");
          continue;
        }
        if (handled.has(type)) continue;
        const namespace = type.split("::")[1] ?? "";
        const services = siteStackServices[namespace];
        expect(services, `${type} needs an entry in siteStackServices`).toBeDefined();
        for (const service of services ?? []) {
          expect(actions, type).toContain(`${service}:*`);
        }
      }
    },
  );
});

describe("the role boundary (contact-form R17.1)", () => {
  type Statement = { Action: string | string[]; Resource: unknown };
  type Resource = {
    Type: string;
    Properties: {
      ManagedPolicyArns?: unknown[];
      PermissionsBoundary?: unknown;
      PolicyDocument?: { Statement: Statement[] };
      ManagedPolicyName?: string;
    };
  };

  const boundary = () => {
    const found = (
      Object.values(template.findResources("AWS::IAM::ManagedPolicy")) as Resource[]
    ).filter((policy) => policy.Properties.ManagedPolicyName === ROLE_BOUNDARY_NAME);
    expect(found).toHaveLength(1);
    return found[0]?.Properties.PolicyDocument?.Statement ?? [];
  };
  const allowed = () => boundary().flatMap((statement) => [statement.Action].flat());
  const siteResources = (flatRatePlan: boolean) => {
    const { site } = defineApp(testApp(), {
      config: { ...testConfig, flatRatePlan },
      manifest: readSiteManifest(testConfig.siteManifest, testConfig.siteDir),
      account: testEnv.account,
    });
    return Object.values(Template.fromStack(site).toJSON().Resources as Record<string, Resource>);
  };

  it("grants nothing that could change IAM, or reach the rest of the account", () => {
    expect(allowed()).not.toContain("*");
    for (const service of ["iam", "sts", "organizations", "lambda", "cloudformation"]) {
      expect(allowed().filter((action) => action.startsWith(`${service}:`))).toEqual([]);
    }
    expect(allowed()).not.toContainEqual(expect.stringMatching(/^[a-z0-9-]+:\*$/));
  });

  it("is attached to no role of this stack: only SiteStack's", () => {
    template.resourcePropertiesCountIs(
      "AWS::IAM::Role",
      { PermissionsBoundary: Match.anyValue() },
      0,
    );
  });

  it.each([false, true])(
    "is on every role in SiteStack, and covers all they're granted, with flatRatePlan %s",
    (flatRatePlan) => {
      const resources = siteResources(flatRatePlan);
      const roles = resources.filter((resource) => resource.Type === "AWS::IAM::Role");
      const toRegex = (pattern: string) => new RegExp(`^${pattern.replaceAll("*", ".*")}$`, "u");
      const patterns = allowed().map(toRegex);

      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        expect(JSON.stringify(role.Properties.PermissionsBoundary)).toContain(
          `policy/${ROLE_BOUNDARY_NAME}`,
        );
      }
      const granted = resources
        .filter((resource) => resource.Type === "AWS::IAM::Policy")
        .flatMap((policy) => policy.Properties.PolicyDocument?.Statement ?? [])
        .flatMap((statement) => [statement.Action].flat());
      expect(granted.length).toBeGreaterThan(0);
      for (const action of granted) {
        // A wildcard grant such as s3:GetObject* has to be matched as written.
        expect(
          patterns.some((pattern) => pattern.test(action)),
          action,
        ).toBe(true);
      }
    },
  );

  it("covers the only managed policy SiteStack attaches", () => {
    const managed = siteResources(true)
      .filter((resource) => resource.Type === "AWS::IAM::Role")
      .flatMap((role) => role.Properties.ManagedPolicyArns ?? []);

    expect(managed.length).toBeGreaterThan(0);
    for (const arn of managed) {
      expect(JSON.stringify(arn)).toContain("AWSLambdaBasicExecutionRole");
    }
    expect(allowed()).toEqual(
      expect.arrayContaining(["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]),
    );
  });
});
