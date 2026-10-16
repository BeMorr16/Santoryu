import { readFileSync } from "node:fs";
import { App } from "aws-cdk-lib";
import { describe, expect, it } from "vitest";
import { siteUrl } from "../../web/src/site.config.ts";
import { readConfig } from "../src/config.ts";

const validContext = {
  "personal-site:region": "us-east-1",
  "personal-site:domainName": "example.test",
  "personal-site:hostedZoneId": "Z0123456789ABCDEFGHIJ",
  "personal-site:githubRepository": "owner/fake-repo",
  "personal-site:githubOidcSubject": "environment:production",
  "personal-site:flatRatePlan": false,
  "personal-site:rateLimitPer5Minutes": 500,
  "personal-site:monthlyBudgetUsd": 5,
  "personal-site:siteDir": "test/fixtures/site",
  "personal-site:siteManifest": "test/fixtures/site-manifest.json",
  budgetEmail: "alerts@example.test",
};

type ContextKey = keyof typeof validContext;

function configWith(overrides: Partial<Record<ContextKey, unknown>>) {
  const context: Record<string, unknown> = { ...validContext, ...overrides };
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) Reflect.deleteProperty(context, key);
  }
  return () => readConfig(new App({ context }).node);
}

describe("readConfig", () => {
  it("returns typed config from valid context", () => {
    expect(configWith({})()).toEqual({
      region: "us-east-1",
      domainName: "example.test",
      hostedZoneId: "Z0123456789ABCDEFGHIJ",
      githubRepository: "owner/fake-repo",
      githubOidcSubject: "environment:production",
      flatRatePlan: false,
      rateLimitPer5Minutes: 500,
      monthlyBudgetUsd: 5,
      siteDir: "test/fixtures/site",
      siteManifest: "test/fixtures/site-manifest.json",
      budgetEmail: "alerts@example.test",
    });
  });

  it("accepts --context string overrides for booleans and integers", () => {
    expect(
      configWith({
        "personal-site:flatRatePlan": "true",
        "personal-site:rateLimitPer5Minutes": "1000",
      })(),
    ).toMatchObject({ flatRatePlan: true, rateLimitPer5Minutes: 1000 });
  });

  it("accepts a branch OIDC subject", () => {
    expect(
      configWith({ "personal-site:githubOidcSubject": "ref:refs/heads/main" })(),
    ).toMatchObject({ githubOidcSubject: "ref:refs/heads/main" });
  });

  const prefixedKeys = Object.keys(validContext).filter((key) => key.startsWith("personal-site:"));

  it.each(prefixedKeys)("throws naming %s when it is missing", (key) => {
    expect(configWith({ [key]: undefined })).toThrow(`Missing CDK context value "${key}"`);
  });

  it("throws with the --context hint when budgetEmail is missing", () => {
    expect(configWith({ budgetEmail: undefined })).toThrow(
      'Missing CDK context value "budgetEmail" (pass --context budgetEmail=…)',
    );
  });

  it.each<[ContextKey, unknown]>([
    ["personal-site:region", "US East"],
    ["personal-site:domainName", "https://example.test"],
    ["personal-site:domainName", "example"],
    ["personal-site:domainName", "Example.test"],
    ["personal-site:hostedZoneId", "REPLACE_WITH_HOSTED_ZONE_ID"],
    ["personal-site:hostedZoneId", "z0123"],
    ["personal-site:githubRepository", "fake-repo"],
    ["personal-site:githubRepository", "owner/repo/extra"],
    ["personal-site:githubOidcSubject", "pull_request"],
    ["personal-site:githubOidcSubject", "environment:"],
    ["personal-site:githubOidcSubject", "ref:refs/tags/v1"],
    ["personal-site:githubOidcSubject", "environment:production:extra"],
    ["personal-site:flatRatePlan", "yes"],
    ["personal-site:flatRatePlan", 1],
    ["personal-site:rateLimitPer5Minutes", 0],
    ["personal-site:rateLimitPer5Minutes", -5],
    ["personal-site:rateLimitPer5Minutes", 2.5],
    ["personal-site:monthlyBudgetUsd", 0],
    ["personal-site:monthlyBudgetUsd", "five"],
    ["personal-site:siteDir", ""],
    ["personal-site:siteManifest", 7],
    ["budgetEmail", "not-an-email"],
    ["budgetEmail", "a@b"],
  ])("throws naming %s when it is %j", (key, value) => {
    expect(configWith({ [key]: value })).toThrow(`Invalid CDK context value "${key}"`);
  });

  it("does not echo an invalid budgetEmail, which would leak into public CI logs", () => {
    expect(configWith({ budgetEmail: "someone@invalid" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("someone") as unknown }),
    );
  });
});

describe("cdk.json", () => {
  it("uses the same domain as the web build's siteUrl", () => {
    const cdkJson = JSON.parse(readFileSync(new URL("../cdk.json", import.meta.url), "utf8")) as {
      context: Record<string, unknown>;
    };

    expect(cdkJson.context["personal-site:domainName"]).toBe(new URL(siteUrl).hostname);
  });

  it("deploys to us-east-1, where CloudFront needs its certificate and WAF (R5.6)", () => {
    const cdkJson = JSON.parse(readFileSync(new URL("../cdk.json", import.meta.url), "utf8")) as {
      context: Record<string, unknown>;
    };

    expect(cdkJson.context["personal-site:region"]).toBe("us-east-1");
  });
});
