import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSiteManifest, inlineScriptHashes, writeSiteManifest } from "./site-manifest.ts";

function sha256(text: string): string {
  return `sha256-${createHash("sha256").update(text, "utf8").digest("base64")}`;
}

function page(...scripts: string[]): string {
  return `<!DOCTYPE html><html><head>${scripts.join("")}</head><body></body></html>`;
}

describe("inlineScriptHashes", () => {
  it("hashes the exact text of each inline script, without trimming", () => {
    const first = '\n  window.__ctx = {"a":1};\n';
    const second = "console.log('é → ✓');";

    expect(
      inlineScriptHashes(page(`<script>${first}</script>`, `<script>${second}</script>`)),
    ).toEqual([sha256(first), sha256(second)]);
  });

  it("includes inline module scripts and skips scripts with src", () => {
    const inline = 'import "/assets/entry.js";';

    expect(
      inlineScriptHashes(
        page(
          '<script src="/assets/app.js"></script>',
          `<script type="module" async="">${inline}</script>`,
        ),
      ),
    ).toEqual([sha256(inline)]);
  });

  it("returns nothing for a page without inline scripts", () => {
    expect(inlineScriptHashes(page())).toEqual([]);
  });
});

describe("buildSiteManifest", () => {
  let clientDir: string;

  beforeEach(async () => {
    clientDir = await mkdtemp(join(tmpdir(), "site-manifest-"));
    await mkdir(join(clientDir, "lab"));
    await mkdir(join(clientDir, "assets"));
    await writeFile(
      join(clientDir, "index.html"),
      page("<script>a</script>", "<script>b</script>"),
    );
    await writeFile(
      join(clientDir, "lab", "index.html"),
      page("<script>b</script>", "<script>c</script>"),
    );
    await writeFile(join(clientDir, "404.html"), page("<script>a</script>"));
    await writeFile(join(clientDir, "robots.txt"), "User-agent: *\n");
    await writeFile(join(clientDir, "sitemap.xml"), "<urlset/>");
    await writeFile(join(clientDir, "assets", "app-1a2b.js"), "<script>z</script>");
  });

  afterEach(async () => {
    await rm(clientDir, { recursive: true, force: true });
  });

  it("lists every file outside assets/ as a sorted root-relative path", async () => {
    const manifest = await buildSiteManifest(clientDir);

    expect(manifest.files).toEqual([
      "/404.html",
      "/index.html",
      "/lab/index.html",
      "/robots.txt",
      "/sitemap.xml",
    ]);
  });

  it("collects the sorted, de-duplicated union of inline script hashes across pages", async () => {
    const manifest = await buildSiteManifest(clientDir);

    expect(manifest.scriptHashes).toEqual([sha256("a"), sha256("b"), sha256("c")].sort());
  });

  it("throws with the measured size when the hashes would exceed S3's 2 KB metadata limit", async () => {
    const scripts = Array.from({ length: 40 }, (_, index) => `<script>${String(index)}</script>`);
    await writeFile(join(clientDir, "index.html"), page(...scripts));

    await expect(buildSiteManifest(clientDir)).rejects.toThrow(
      /S3 user metadata.* \d+ bytes.*2048/,
    );
  });
});

describe("writeSiteManifest", () => {
  let buildDir: string;

  beforeEach(async () => {
    buildDir = await mkdtemp(join(tmpdir(), "site-manifest-build-"));
    await mkdir(join(buildDir, "client"));
    await writeFile(join(buildDir, "client", "index.html"), page("<script>a</script>"));
  });

  afterEach(async () => {
    await rm(buildDir, { recursive: true, force: true });
  });

  it("writes the manifest as JSON next to the client directory, not inside it", async () => {
    await writeSiteManifest(join(buildDir, "client"), join(buildDir, "site-manifest.json"));

    expect(JSON.parse(await readFile(join(buildDir, "site-manifest.json"), "utf8"))).toEqual({
      files: ["/index.html"],
      scriptHashes: [sha256("a")],
    });
  });
});
