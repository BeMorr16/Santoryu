import type { Node } from "constructs";

/** Validated CDK context (static-hosting design §8). Committed values live in cdk.json. */
export interface SiteConfig {
  region: string;
  domainName: string;
  hostedZoneId: string;
  githubRepository: string;
  /** The part of the GitHub OIDC `sub` claim after `repo:<owner>/<repo>:`. */
  githubOidcSubject: string;
  flatRatePlan: boolean;
  rateLimitPer5Minutes: number;
  monthlyBudgetUsd: number;
  /** Relative to infra/. */
  siteDir: string;
  /** Relative to infra/. */
  siteManifest: string;
  /** Never committed; passed with --context budgetEmail=… */
  budgetEmail: string;
}

/** Applied to every taggable resource (R5.6). */
export const PROJECT_TAG = { key: "project", value: "personal-site" } as const;

const PREFIX = "personal-site:";

const patterns = {
  region: /^[a-z]{2}(-[a-z]+)+-\d+$/,
  domainName: /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
  hostedZoneId: /^Z[A-Z0-9]{1,31}$/,
  githubRepository: /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/,
  githubOidcSubject: /^(environment:[^:\s]+|ref:refs\/heads\/[^:\s]+)$/,
  email: /^[^@\s]+@([^@\s.]+\.)+[^@\s.]+$/,
};

function invalid(key: string, expected: string): Error {
  return new Error(`Invalid CDK context value "${key}": expected ${expected}.`);
}

const got = (value: unknown) => `, got ${JSON.stringify(value)}`;

export function readConfig(node: Node): SiteConfig {
  const raw = (key: string): unknown => {
    const value: unknown = node.tryGetContext(PREFIX + key);
    if (value === undefined) throw new Error(`Missing CDK context value "${PREFIX}${key}".`);
    return value;
  };

  const string = (key: string, pattern?: RegExp, expected = "a non-empty string"): string => {
    const value = raw(key);
    if (typeof value !== "string" || value === "" || (pattern && !pattern.test(value))) {
      throw invalid(PREFIX + key, expected + got(value));
    }
    return value;
  };

  // --context overrides arrive as strings, so "true"/"500" are accepted alongside JSON values.
  const boolean = (key: string): boolean => {
    const value = raw(key);
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw invalid(PREFIX + key, "true or false" + got(value));
  };

  const positiveInteger = (key: string): number => {
    const value = raw(key);
    const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof number !== "number" || !Number.isInteger(number) || number <= 0) {
      throw invalid(PREFIX + key, "a positive integer" + got(value));
    }
    return number;
  };

  const budgetEmail: unknown = node.tryGetContext("budgetEmail");
  if (budgetEmail === undefined) {
    throw new Error('Missing CDK context value "budgetEmail" (pass --context budgetEmail=…).');
  }
  if (typeof budgetEmail !== "string" || !patterns.email.test(budgetEmail)) {
    // The value is not echoed: synth errors in CI end up in public logs.
    throw invalid("budgetEmail", "an email address");
  }

  return {
    region: string("region", patterns.region, "an AWS region such as us-east-1"),
    domainName: string("domainName", patterns.domainName, "a lower-case domain name"),
    hostedZoneId: string("hostedZoneId", patterns.hostedZoneId, "a Route 53 zone ID (Z…)"),
    githubRepository: string("githubRepository", patterns.githubRepository, "owner/repo"),
    githubOidcSubject: string(
      "githubOidcSubject",
      patterns.githubOidcSubject,
      "environment:<name> or ref:refs/heads/<branch>",
    ),
    flatRatePlan: boolean("flatRatePlan"),
    rateLimitPer5Minutes: positiveInteger("rateLimitPer5Minutes"),
    monthlyBudgetUsd: positiveInteger("monthlyBudgetUsd"),
    siteDir: string("siteDir"),
    siteManifest: string("siteManifest"),
    budgetEmail,
  };
}
