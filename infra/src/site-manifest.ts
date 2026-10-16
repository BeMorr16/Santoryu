import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** Written by the web build (web/scripts/site-manifest.ts) next to build/client/. */
export interface SiteManifest {
  /** Every published file outside assets/, as a root-relative path. */
  files: string[];
  /** CSP `sha256-…` sources for every inline script in every page. */
  scriptHashes: string[];
}

const SHA256_SOURCE = /^sha256-[A-Za-z0-9+/]{43}=$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function siteFiles(siteDir: string): string[] {
  return readdirSync(siteDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `/${relative(siteDir, join(entry.parentPath, entry.name))}`)
    .filter((path) => !path.startsWith("/assets/"));
}

/** Reads the web build's manifest and checks it still describes the files about to be published. */
export function readSiteManifest(manifestPath: string, siteDir: string): SiteManifest {
  for (const path of [manifestPath, siteDir]) {
    if (!existsSync(path)) throw new Error(`Run pnpm run build first (expected ${path})`);
  }

  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<
    Record<keyof SiteManifest, unknown>
  >;
  if (!isStringArray(parsed.files)) {
    throw new Error(`${manifestPath}: "files" must be a list of paths.`);
  }
  if (
    !isStringArray(parsed.scriptHashes) ||
    !parsed.scriptHashes.every((hash) => SHA256_SOURCE.test(hash))
  ) {
    throw new Error(`${manifestPath}: "scriptHashes" must be a list of sha256-<base64> sources.`);
  }

  const actual = new Set(siteFiles(siteDir));
  const listed = new Set(parsed.files);
  const missing = [...listed].filter((path) => !actual.has(path));
  const unlisted = [...actual].filter((path) => !listed.has(path));
  if (missing.length > 0 || unlisted.length > 0) {
    throw new Error(
      `${manifestPath} does not match ${siteDir}. Rebuild with pnpm run build.\n` +
        `  missing from the site: ${missing.join(", ") || "none"}\n` +
        `  not in the manifest: ${unlisted.join(", ") || "none"}`,
    );
  }

  return { files: parsed.files, scriptHashes: parsed.scriptHashes };
}
