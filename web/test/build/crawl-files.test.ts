import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { componentPages, componentPath } from "../../src/design-system/components/pages.ts";
import { siteUrl, turnstileSiteKey } from "../../src/site.config.ts";

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

describe(".well-known/security.txt (contact-form R14)", () => {
  const file = () => readFileSync(`${clientDir}.well-known/security.txt`, "utf8");

  it("has the contact page and the language", () => {
    expect(file()).toContain(`Contact: ${siteUrl}/contact\n`);
    expect(file()).toContain("Preferred-Languages: en\n");
  });

  it("expires in the future, under a year out", () => {
    const expires = new Date(/^Expires: (.+)$/m.exec(file())?.[1] ?? "").getTime();

    expect(expires).toBeGreaterThan(Date.now());
    expect(expires - Date.now()).toBeLessThan(365 * 24 * 60 * 60 * 1000);
  });

  it("is listed in the site manifest, so the edge router serves it", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../build/site-manifest.json", import.meta.url), "utf8"),
    ) as { files: string[] };

    expect(manifest.files).toContain("/.well-known/security.txt");
  });
});

describe("the whole build output (contact-form R9.4)", () => {
  const textFiles = () =>
    readdirSync(clientDir, { recursive: true, encoding: "utf8" })
      .filter((path) => /\.(html|js|css|txt|xml|json|webmanifest)$/.test(path))
      .map((path) => ({ path, text: readFileSync(`${clientDir}${path}`, "utf8") }));

  it("reads the files it means to check", () => {
    const paths = textFiles().map(({ path }) => path);

    expect(paths).toContain("index.html");
    expect(paths).toContain(".well-known/security.txt");
    expect(paths.some((path) => path.startsWith("assets/") && path.endsWith(".js"))).toBe(true);
  });

  it("publishes no address on the site's domain", () => {
    for (const { path, text } of textFiles()) {
      expect(text.includes("@ben-morrison.com"), path).toBe(false);
    }
  });

  it("has no mailto: link, apart from the Link docs' example.com demonstration", () => {
    for (const { path, text } of textFiles()) {
      expect(text.replaceAll("mailto:hello@example.com", "").includes("mailto:"), path).toBe(false);
    }
  });

  it("has Cloudflare's test key nowhere, and the real site key somewhere", () => {
    const files = textFiles();

    for (const { path, text } of files) {
      expect(text.includes("1x00000000000000000000AA"), path).toBe(false);
    }
    expect(files.some(({ text }) => text.includes(turnstileSiteKey))).toBe(true);
  });

  it("has none of the dev mock's addresses", () => {
    for (const { path, text } of textFiles()) {
      expect(text.includes("fail@example.test"), path).toBe(false);
    }
  });
});
