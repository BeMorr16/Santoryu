import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { componentPages, componentPath } from "../../src/design-system/components/pages.ts";
import { siteUrl } from "../../src/site.config.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const sitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

/** Canonical links of every built page except the not-found page, which has none. */
function canonicalLinks(): string[] {
  return readdirSync(clientDir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".html") && path !== "404.html")
    .map((path) => {
      const document = new JSDOM(readFileSync(`${clientDir}${path}`, "utf8")).window.document;
      const href = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
      if (!href) throw new Error(`${path} has no canonical link`);
      return href;
    });
}

describe("sitemap.xml", () => {
  const sitemap = () =>
    new JSDOM(readFileSync(`${clientDir}sitemap.xml`, "utf8"), { contentType: "application/xml" })
      .window.document;

  it("is well-formed XML with a sitemaps.org 0.9 urlset root", () => {
    const root = sitemap().documentElement;
    expect(root.localName).toBe("urlset");
    expect(root.namespaceURI).toBe(sitemapNamespace);
    expect(sitemap().getElementsByTagName("parsererror")).toHaveLength(0);
  });

  it("gives each url exactly one absolute https loc and nothing else", () => {
    const urls = [...sitemap().documentElement.children];
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.length).toBeLessThanOrEqual(50_000);
    for (const url of urls) {
      expect(url.localName).toBe("url");
      expect(url.namespaceURI).toBe(sitemapNamespace);
      expect([...url.children].map((child) => child.localName)).toEqual(["loc"]);
      const loc = url.children[0]?.textContent ?? "";
      expect(new URL(loc).protocol).toBe("https:");
    }
  });

  it("lists the design system sub-pages (R14.2)", () => {
    const locs = [...sitemap().getElementsByTagNameNS(sitemapNamespace, "loc")].map(
      (loc) => loc.textContent,
    );
    expect(locs).toEqual(
      expect.arrayContaining([
        `${siteUrl}/design-system`,
        `${siteUrl}/design-system/tokens`,
        `${siteUrl}/design-system/components`,
      ]),
    );
  });

  it("lists every component page (ds-components R1.1, R6.2)", () => {
    const locs = [...sitemap().getElementsByTagNameNS(sitemapNamespace, "loc")].map(
      (loc) => loc.textContent,
    );
    expect(locs).toEqual(
      expect.arrayContaining(componentPages.map(({ id }) => `${siteUrl}${componentPath(id)}`)),
    );
  });

  it("lists exactly the canonical URLs of the built pages", () => {
    const locs = [...sitemap().getElementsByTagNameNS(sitemapNamespace, "loc")].map(
      (loc) => loc.textContent,
    );
    expect(new Set(locs).size).toBe(locs.length);
    expect(new Set(locs)).toEqual(new Set(canonicalLinks()));
  });
});

describe("robots.txt", () => {
  it("allows all crawlers and declares the sitemap", () => {
    expect(readFileSync(`${clientDir}robots.txt`, "utf8")).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    );
  });
});
