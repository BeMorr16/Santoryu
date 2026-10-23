import { join } from "node:path";
import type { Config } from "@react-router/dev/config";
import { writeCrawlFiles } from "./scripts/crawl-files.ts";
import { finalize404, removeSpaFallback } from "./scripts/finalize-404.ts";
import { writeSiteManifest } from "./scripts/site-manifest.ts";
import {
  componentPages,
  componentPath,
  themeCreatorPath,
} from "./src/design-system/components/pages.ts";
import { siteUrl } from "./src/site.config.ts";

const prerender = [
  "/",
  "/design-system",
  "/design-system/tokens",
  themeCreatorPath,
  "/design-system/components",
  ...componentPages.map(({ id }) => componentPath(id)),
  "/404",
];

export default {
  appDirectory: "src",
  ssr: false,
  prerender,
  async buildEnd({ reactRouterConfig }) {
    const clientDir = join(reactRouterConfig.buildDirectory, "client");
    await finalize404(clientDir);
    await removeSpaFallback(clientDir);
    await writeCrawlFiles(clientDir, prerender, siteUrl);
    // Last, so it sees the final file set. Written next to client/, so it is never published.
    await writeSiteManifest(
      clientDir,
      join(reactRouterConfig.buildDirectory, "site-manifest.json"),
    );
  },
} satisfies Config;
