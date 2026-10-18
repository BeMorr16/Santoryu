import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The web build that `pnpm run build` writes and `test:build` checks (design §11.1). */
export const clientDir = fileURLToPath(new URL("../web/build/client/", import.meta.url));
const manifestPath = fileURLToPath(new URL("../web/build/site-manifest.json", import.meta.url));

export interface SiteManifest {
  files: string[];
  scriptHashes: string[];
}

/** Fails with the R16.1 message when there's no build to test. */
export function readManifest(): SiteManifest {
  if (!existsSync(clientDir) || !existsSync(manifestPath)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as SiteManifest;
}
