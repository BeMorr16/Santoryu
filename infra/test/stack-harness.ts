import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import type { SiteConfig } from "../src/config.ts";

/** A config with no real values, so tests can check nothing committed leaks into templates. */
export const testConfig: SiteConfig = {
  region: "us-east-1",
  domainName: "example.test",
  hostedZoneId: "Z0FAKEZONE00000000000",
  githubRepository: "owner/fake",
  githubOidcSubject: "environment:production",
  flatRatePlan: false,
  rateLimitPer5Minutes: 500,
  monthlyBudgetUsd: 5,
  siteDir: fileURLToPath(new URL("fixtures/site", import.meta.url)),
  siteManifest: fileURLToPath(new URL("fixtures/site-manifest.json", import.meta.url)),
  budgetEmail: "alerts@example.test",
};

export const testEnv = { account: "111111111111", region: testConfig.region };

/** An App with cdk.json's feature flags (but none of its personal-site values), as synth uses. */
export function testApp(): App {
  const cdkJson = JSON.parse(readFileSync(new URL("../cdk.json", import.meta.url), "utf8")) as {
    context: Record<string, unknown>;
  };
  const flags = Object.fromEntries(
    Object.entries(cdkJson.context).filter(([key]) => !key.startsWith("personal-site:")),
  );
  return new App({ context: flags });
}
