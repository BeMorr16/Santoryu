import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { homeContent } from "../../src/content/home.ts";
import { siteUrl } from "../../src/site.config.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

const pages = [
  {
    file: "index.html",
    title: homeContent.title,
    canonical: `${siteUrl}/`,
    h1: homeContent.name,
    bodyText: homeContent.intro,
  },
  {
    file: "lab/index.html",
    title: "Lab · Ben",
    canonical: `${siteUrl}/lab`,
    h1: "Lab",
    bodyText: "--color-text-default",
  },
  {
    file: "404.html",
    title: "Page not found · Ben",
    canonical: undefined,
    h1: "Page not found",
    bodyText: "Go to the home page",
  },
] as const;

const documents = new Map<string, Document>();

function documentFor(file: string): Document {
  const document = documents.get(file);
  if (!document) throw new Error(`${file} was not loaded`);
  return document;
}

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
  for (const { file } of pages) {
    // JSDOM runs no scripts by default, so this is the HTML as served, before hydration.
    const dom = new JSDOM(readFileSync(`${clientDir}${file}`, "utf8"));
    documents.set(file, dom.window.document);
  }
});

describe("build output files", () => {
  it("emits /lab as lab/index.html and the not-found page as a root 404.html", () => {
    expect(existsSync(`${clientDir}index.html`)).toBe(true);
    expect(existsSync(`${clientDir}lab/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}404.html`)).toBe(true);
    expect(existsSync(`${clientDir}404`)).toBe(false);
  });

  it("gives every page a unique title", () => {
    const titles = pages.map(({ file }) => documentFor(file).title);
    expect(new Set(titles).size).toBe(pages.length);
  });
});

describe.each(pages)("$file", (page) => {
  const head = () => documentFor(page.file).head;
  const body = () => within(documentFor(page.file).body);

  it('has <html lang="en">, a charset, and a responsive viewport', () => {
    const document = documentFor(page.file);
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(head().querySelector("meta[charset]")?.getAttribute("charset")?.toLowerCase()).toBe(
      "utf-8",
    );
    expect(head().querySelector('meta[name="viewport"]')?.getAttribute("content")).toContain(
      "width=device-width",
    );
  });

  it(`is titled "${page.title}" with a description`, () => {
    expect(documentFor(page.file).title).toBe(page.title);
    expect(head().querySelector('meta[name="description"]')?.getAttribute("content")).toMatch(/\S/);
  });

  if (page.canonical === undefined) {
    it("is noindex and has no canonical link", () => {
      expect(head().querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex");
      expect(head().querySelector('link[rel="canonical"]')).toBeNull();
    });
  } else {
    const canonical = page.canonical;
    it(`has the canonical link ${canonical}`, () => {
      const links = head().querySelectorAll('link[rel="canonical"]');
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("href")).toBe(canonical);
      expect(head().querySelector('meta[name="robots"]')).toBeNull();
    });
  }

  it("contains its h1 and main body text without JavaScript", () => {
    const h1s = body().getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe(page.h1);
    expect(body().getByRole("main").textContent).toContain(page.bodyText);
  });

  it("has exactly one banner, Primary navigation, main and contentinfo landmark", () => {
    expect(body().getAllByRole("banner")).toHaveLength(1);
    expect(body().getAllByRole("navigation")).toHaveLength(1);
    expect(body().getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(body().getAllByRole("main")).toHaveLength(1);
    expect(body().getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("makes the skip link the first focusable element, targeting main", () => {
    const document = documentFor(page.file);
    const first = document.body.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(first?.textContent).toBe("Skip to main content");
    expect(first?.getAttribute("href")).toBe("#main");
    expect(document.getElementById("main")?.tagName).toBe("MAIN");
  });
});
