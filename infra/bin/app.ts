import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { defineApp } from "../src/app.ts";
import { readConfig } from "../src/config.ts";
import { readSiteManifest } from "../src/site-manifest.ts";

const infraDir = fileURLToPath(new URL("..", import.meta.url));

const app = new App();
const config = readConfig(app.node);
const siteDir = resolve(infraDir, config.siteDir);
const manifest = readSiteManifest(resolve(infraDir, config.siteManifest), siteDir);

defineApp(app, {
  config: { ...config, siteDir },
  manifest,
  account: process.env.CDK_DEFAULT_ACCOUNT,
});
