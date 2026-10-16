import { Tags, type App } from "aws-cdk-lib";
import { CiAccessStack } from "./ci-access-stack.ts";
import { PROJECT_TAG, type SiteConfig } from "./config.ts";
import type { SiteManifest } from "./site-manifest.ts";
import { SiteStack } from "./site-stack.ts";

export interface AppInputs {
  config: SiteConfig;
  manifest: SiteManifest;
  /** From CDK_DEFAULT_ACCOUNT; undefined synthesizes an environment-agnostic account. */
  account: string | undefined;
}

/** Both stacks, in one region, tagged project=personal-site (static-hosting design §1, §8). */
export function defineApp(app: App, { config, manifest, account }: AppInputs) {
  const env = { account, region: config.region };
  const ciAccess = new CiAccessStack(app, "CiAccessStack", { env, config });
  const site = new SiteStack(app, "SiteStack", { env, config, manifest });
  Tags.of(app).add(PROJECT_TAG.key, PROJECT_TAG.value);
  return { ciAccess, site };
}
