import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { previewImage } from "../../src/shell/page-meta.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const imagePath = `${clientDir}og-image.png`;

if (!existsSync(clientDir)) throw new Error("No build output found. Run `pnpm run build` first.");

const indexPages = readdirSync(clientDir, { recursive: true, encoding: "utf8" }).filter(
  (path) => path === "index.html" || path.endsWith("/index.html"),
);

const documentOf = (file: string) =>
  new JSDOM(readFileSync(`${clientDir}${file}`, "utf8")).window.document;

describe.each(indexPages)("%s link preview (home R7.1, R7.2)", (file) => {
  const document = documentOf(file);
  const property = (name: string) =>
    document.head.querySelector(`meta[property="${name}"]`)?.getAttribute("content");
  const named = (name: string) =>
    document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content");

  it("has every Open Graph tag and twitter:card", () => {
    expect(property("og:type")).toBe("website");
    expect(property("og:site_name")).toBe("Ben Morrison");
    expect(property("og:image")).toBe(previewImage.url);
    expect(property("og:image:width")).toBe("1200");
    expect(property("og:image:height")).toBe("630");
    expect(property("og:image:alt")).toBe(previewImage.alt);
    expect(named("twitter:card")).toBe("summary_large_image");
  });

  it("matches its own title, description and canonical URL", () => {
    for (const name of ["og:title", "og:description", "og:url"]) {
      expect(property(name), name).toMatch(/\S/);
    }
    expect(property("og:title")).toBe(document.title);
    expect(property("og:description")).toBe(named("description"));
    expect(property("og:url")).toBe(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    );
  });
});

describe("link previews", () => {
  it("covers every indexable page", () => {
    expect(indexPages).toContain("index.html");
    expect(indexPages).toContain("contact/index.html");
    expect(indexPages).toContain("design-system/index.html");
  });

  it("leaves the 404 page without preview tags (R7.3)", () => {
    const head = documentOf("404.html").head;
    expect(head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')).toHaveLength(0);
  });

  it("publishes og-image.png: a PNG, 1200×630, at most 300 KB (R7.4)", () => {
    expect(existsSync(imagePath), "Run `pnpm run og-image`, then build again").toBe(true);
    const png = readFileSync(imagePath);
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.toString("latin1", 12, 16)).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(statSync(imagePath).size).toBeLessThanOrEqual(300 * 1024);
  });
});
