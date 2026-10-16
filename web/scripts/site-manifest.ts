import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { JSDOM } from "jsdom";

export interface SiteManifest {
  /** Every published file outside assets/, as a root-relative path. Drives the edge router. */
  files: string[];
  /** CSP sources for every inline script in every page, applied via S3 object metadata. */
  scriptHashes: string[];
}

/**
 * S3 caps user metadata at 2 KB, counted as the UTF-8 bytes of every key and value. The
 * not-found page carries the most: csp-script-hashes plus site-status: 404 (static-hosting §6).
 */
const S3_USER_METADATA_LIMIT_BYTES = 2048;
const notFoundMetadata = { "csp-script-hashes": "", "site-status": "404" };

/** `sha256-<base64>` of the exact text of each `<script>` without `src`, in document order. */
export function inlineScriptHashes(html: string): string[] {
  const { document } = new JSDOM(html).window;
  return [...document.querySelectorAll("script:not([src])")].map(
    (script) =>
      `sha256-${createHash("sha256").update(script.textContent, "utf8").digest("base64")}`,
  );
}

function metadataBytes(scriptHashes: readonly string[]): number {
  const metadata = { ...notFoundMetadata, "csp-script-hashes": scriptHashes.join(" ") };
  return Object.entries(metadata).reduce(
    (total, [key, value]) => total + Buffer.byteLength(key) + Buffer.byteLength(value),
    0,
  );
}

export async function buildSiteManifest(clientDir: string): Promise<SiteManifest> {
  const paths = (await readdir(clientDir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `/${relative(clientDir, join(entry.parentPath, entry.name))}`)
    .filter((path) => !path.startsWith("/assets/"))
    .sort();

  const hashes = new Set<string>();
  for (const path of paths.filter((path) => path.endsWith(".html"))) {
    for (const hash of inlineScriptHashes(await readFile(join(clientDir, path), "utf8"))) {
      hashes.add(hash);
    }
  }
  const scriptHashes = [...hashes].sort();

  const size = metadataBytes(scriptHashes);
  if (size > S3_USER_METADATA_LIMIT_BYTES) {
    throw new Error(
      `S3 user metadata for ${String(scriptHashes.length)} CSP script hashes would be ` +
        `${String(size)} bytes, over the ${String(S3_USER_METADATA_LIMIT_BYTES)}-byte limit.`,
    );
  }
  return { files: paths, scriptHashes };
}

export async function writeSiteManifest(clientDir: string, manifestPath: string): Promise<void> {
  const manifest = await buildSiteManifest(clientDir);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
