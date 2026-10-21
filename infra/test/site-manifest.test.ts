import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSiteManifest } from "../src/site-manifest.ts";

const fixtures = fileURLToPath(new URL("fixtures/", import.meta.url));

let workDir: string;
let siteDir: string;
let manifestPath: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "infra-site-manifest-"));
  siteDir = join(workDir, "site");
  manifestPath = join(workDir, "site-manifest.json");
  await cp(join(fixtures, "site"), siteDir, { recursive: true });
  await cp(join(fixtures, "site-manifest.json"), manifestPath);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("readSiteManifest", () => {
  it("returns the manifest when it matches the site files", () => {
    expect(readSiteManifest(manifestPath, siteDir)).toEqual({
      files: [
        "/404.html",
        "/design-system/components/index.html",
        "/design-system/index.html",
        "/design-system/tokens/index.html",
        "/index.html",
        "/robots.txt",
        "/sitemap.xml",
      ],
      scriptHashes: [
        "sha256-OSR+YjyboAoO+CpHBAWVYrFe/ToY6iSXk6LGV+Al7YU=",
        "sha256-trFr8w1a/9B5jvmHNRMMlExl0/RsiC38OsiSeBAFUWc=",
      ],
    });
  });

  it("tells you to build first when the manifest is missing", async () => {
    await rm(manifestPath);

    expect(() => readSiteManifest(manifestPath, siteDir)).toThrow(
      `Run pnpm run build first (expected ${manifestPath})`,
    );
  });

  it("tells you to build first when the site directory is missing", async () => {
    await rm(siteDir, { recursive: true });

    expect(() => readSiteManifest(manifestPath, siteDir)).toThrow(
      `Run pnpm run build first (expected ${siteDir})`,
    );
  });

  it("lists files that are in the manifest but not the site, and the reverse", async () => {
    await rm(join(siteDir, "robots.txt"));
    await writeFile(join(siteDir, "extra.txt"), "extra");

    expect(() => readSiteManifest(manifestPath, siteDir)).toThrow(
      /missing from the site: \/robots\.txt.*not in the manifest: \/extra\.txt/s,
    );
  });

  it("rejects a script hash that is not a sha256 CSP source", async () => {
    await writeFile(
      manifestPath,
      JSON.stringify({
        files: [
          "/404.html",
          "/design-system/components/index.html",
          "/design-system/index.html",
          "/design-system/tokens/index.html",
          "/index.html",
          "/robots.txt",
          "/sitemap.xml",
        ],
        scriptHashes: ["sha256-abc'; script-src *"],
      }),
    );

    expect(() => readSiteManifest(manifestPath, siteDir)).toThrow(/scriptHashes/);
  });

  it("rejects a manifest without a files list", async () => {
    await writeFile(manifestPath, JSON.stringify({ scriptHashes: [] }));

    expect(() => readSiteManifest(manifestPath, siteDir)).toThrow(/files/);
  });
});
