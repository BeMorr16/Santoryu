import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

const buildDir = fileURLToPath(new URL("../../build/", import.meta.url));
const clientDir = `${buildDir}client/`;
const manifestPath = `${buildDir}site-manifest.json`;

interface Manifest {
  files: string[];
  scriptHashes: string[];
}

let manifest: Manifest;

beforeAll(() => {
  if (!existsSync(manifestPath)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
  manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
});

/** Every file in client/, relative to it. */
const builtFiles = () =>
  readdirSync(clientDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(clientDir, join(entry.parentPath, entry.name)));
const pages = () => builtFiles().filter((path) => path.endsWith(".html"));

/** Recomputed here, independently of scripts/site-manifest.ts. JSON-LD data blocks never execute. */
function inlineScriptHashes(page: string): string[] {
  const { document } = new JSDOM(readFileSync(`${clientDir}${page}`, "utf8")).window;
  return [...document.querySelectorAll("script")]
    .filter((script) => !script.hasAttribute("src") && script.type !== "application/ld+json")
    .map((script) => {
      const digest = createHash("sha256").update(script.textContent, "utf8").digest("base64");
      return `sha256-${digest}`;
    });
}

describe("site-manifest.json", () => {
  it("is not published inside client/", () => {
    expect(existsSync(`${clientDir}site-manifest.json`)).toBe(false);
  });

  it("covers every inline script of every page with a CSP hash", () => {
    for (const page of pages()) {
      const hashes = inlineScriptHashes(page);
      expect(hashes.length, `${page} has no inline scripts`).toBeGreaterThan(0);
      for (const hash of hashes) {
        expect(manifest.scriptHashes, `${page}: inline script ${hash} is not in the CSP`).toContain(
          hash,
        );
      }
    }
  });

  it("has no hashes beyond the pages' inline scripts", () => {
    const actual = new Set(pages().flatMap(inlineScriptHashes));
    expect(new Set(manifest.scriptHashes)).toEqual(actual);
    expect(manifest.scriptHashes).toHaveLength(actual.size);
  });

  it("lists exactly the built files outside assets/", () => {
    const actual = builtFiles()
      .filter((path) => !path.startsWith("assets/"))
      .map((path) => `/${path}`)
      .sort();
    expect(manifest.files).toEqual(actual);
  });

  it("keeps the not-found page's S3 user metadata within 2 KB", () => {
    const metadata = { "csp-script-hashes": manifest.scriptHashes.join(" "), "site-status": "404" };
    const bytes = Object.entries(metadata).reduce(
      (total, [key, value]) => total + Buffer.byteLength(key) + Buffer.byteLength(value),
      0,
    );
    expect(bytes).toBeLessThanOrEqual(2048);
  });
});
