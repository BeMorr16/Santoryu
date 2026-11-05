import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderRobots, renderSecurityTxt, renderSitemap, writeCrawlFiles } from "./crawl-files.ts";

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

describe("renderSecurityTxt (contact-form R14)", () => {
  const now = new Date("2026-11-05T15:30:45.000Z");

  it("has the contact page, an expiry and the language, in RFC 9116's form", () => {
    expect(renderSecurityTxt(siteUrl, now)).toBe(
      "Contact: https://example.test/contact\n" +
        "Expires: 2027-11-04T00:00:00.000Z\n" +
        "Preferred-Languages: en\n",
    );
  });

  it("expires under a year out, however late in the day it's built", () => {
    const line = renderSecurityTxt(siteUrl, new Date("2028-02-29T23:59:59.000Z"))
      .split("\n")
      .find((text) => text.startsWith("Expires: "));
    const expires = new Date(line?.slice("Expires: ".length) ?? "");

    expect(expires.getTime() - Date.UTC(2028, 1, 29, 23, 59, 59)).toBeLessThan(
      365 * 24 * 60 * 60 * 1000,
    );
    expect(expires.getTime()).toBeGreaterThan(Date.UTC(2028, 1, 29, 23, 59, 59));
  });

  it("gives the same file for the whole day, so a rebuild changes nothing", () => {
    expect(renderSecurityTxt(siteUrl, new Date("2026-11-05T00:00:01Z"))).toBe(
      renderSecurityTxt(siteUrl, new Date("2026-11-05T23:59:59Z")),
    );
  });

  it("publishes no email address", () => {
    expect(renderSecurityTxt(siteUrl, now)).not.toContain("@");
    expect(renderSecurityTxt(siteUrl, now)).not.toContain("mailto:");
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

  it("writes security.txt under .well-known, from the build's time", async () => {
    const now = new Date("2026-11-05T12:00:00Z");

    await writeCrawlFiles(clientDir, ["/"], siteUrl, now);

    expect(await readFile(join(clientDir, ".well-known/security.txt"), "utf8")).toBe(
      renderSecurityTxt(siteUrl, now),
    );
  });

  it("writes sitemap.xml and robots.txt at the build root", async () => {
    await writeCrawlFiles(clientDir, ["/", "/404"], siteUrl);

    expect(await readFile(join(clientDir, "sitemap.xml"), "utf8")).toBe(
      renderSitemap(["/", "/404"], siteUrl),
    );
    expect(await readFile(join(clientDir, "robots.txt"), "utf8")).toBe(renderRobots(siteUrl));
  });
});
