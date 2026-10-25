import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderRobots, renderSitemap, writeCrawlFiles } from "./crawl-files.ts";

const siteUrl = "https://example.test";

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1] ?? "");
}

describe("renderSitemap", () => {
  it("lists the canonical URL of every prerendered route except /404", () => {
    const xml = renderSitemap(["/", "/design-system", "/404"], siteUrl);

    expect(locs(xml)).toEqual(["https://example.test/", "https://example.test/design-system"]);
  });

  it("starts with an XML declaration and uses the sitemaps.org 0.9 namespace", () => {
    const xml = renderSitemap(["/"], siteUrl);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("includes a newly prerendered route with no other change", () => {
    const xml = renderSitemap(["/", "/design-system", "/projects", "/404"], siteUrl);

    expect(locs(xml)).toContain("https://example.test/projects");
  });
});

describe("renderRobots", () => {
  it("allows all crawlers and declares the sitemap", () => {
    expect(renderRobots(siteUrl)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n",
    );
  });
});

describe("writeCrawlFiles", () => {
  let clientDir: string;

  beforeEach(async () => {
    clientDir = await mkdtemp(join(tmpdir(), "crawl-files-"));
  });

  afterEach(async () => {
    await rm(clientDir, { recursive: true, force: true });
  });

  it("writes sitemap.xml and robots.txt at the build root", async () => {
    await writeCrawlFiles(clientDir, ["/", "/404"], siteUrl);

    expect(await readFile(join(clientDir, "sitemap.xml"), "utf8")).toBe(
      renderSitemap(["/", "/404"], siteUrl),
    );
    expect(await readFile(join(clientDir, "robots.txt"), "utf8")).toBe(renderRobots(siteUrl));
  });
});
