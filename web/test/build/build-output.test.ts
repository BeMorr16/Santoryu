import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { homeContent, homeTitle } from "../../src/content/home.ts";
import { siteUrl } from "../../src/site.config.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

const pages = [
  {
    file: "index.html",
    title: homeTitle,
    canonical: `${siteUrl}/`,
    h1: homeContent.name,
    bodyText: homeContent.intro,
  },
  {
    file: "design-system/index.html",
    title: "Design System · Ben Morrison",
    canonical: `${siteUrl}/design-system`,
    h1: "Design System",
    bodyText: "Components",
  },
  {
    file: "design-system/tokens/index.html",
    title: "Tokens · Design System · Ben Morrison",
    canonical: `${siteUrl}/design-system/tokens`,
    h1: "Tokens",
    bodyText: "--component-button-primary-background",
  },
  {
    file: "design-system/components/index.html",
    title: "Components · Design System · Ben Morrison",
    canonical: `${siteUrl}/design-system/components`,
    h1: "Components",
    bodyText: "Principles",
    docs: true,
  },
  {
    file: "404.html",
    title: "Page not found · Ben Morrison",
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
  it("emits each route as <route>/index.html and the not-found page as a root 404.html (R14.2)", () => {
    expect(existsSync(`${clientDir}index.html`)).toBe(true);
    expect(existsSync(`${clientDir}experience/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}contact/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}design-system/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}design-system/tokens/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}design-system/components/index.html`)).toBe(true);
    expect(existsSync(`${clientDir}404.html`)).toBe(true);
    expect(existsSync(`${clientDir}404`)).toBe(false);
  });

  it("emits nothing under lab/ (ds-components R1.2)", () => {
    expect(existsSync(`${clientDir}lab`)).toBe(false);
  });

  it("does not emit __spa-fallback.html", () => {
    expect(existsSync(`${clientDir}__spa-fallback.html`)).toBe(false);
  });

  it("names every HTML file index.html, <route>/index.html or 404.html, so a publish group covers it", () => {
    const htmlFiles = readdirSync(clientDir, { recursive: true, encoding: "utf8" }).filter((path) =>
      path.endsWith(".html"),
    );
    expect(htmlFiles.length).toBeGreaterThan(0);
    for (const path of htmlFiles) {
      expect(path).toMatch(/^((.+\/)?index\.html|404\.html)$/);
    }
  });

  it("gives every page a unique title", () => {
    const titles = pages.map(({ file }) => documentFor(file).title);
    expect(new Set(titles).size).toBe(pages.length);
  });
});

describe.each(pages)("$file", (page) => {
  const head = () => documentFor(page.file).head;
  const body = () => within(documentFor(page.file).body);

  it('has <html lang="en">, a charset, and a responsive viewport that draws edge to edge', () => {
    const document = documentFor(page.file);
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(head().querySelector("meta[charset]")?.getAttribute("charset")?.toLowerCase()).toBe(
      "utf-8",
    );
    const viewport = head().querySelector('meta[name="viewport"]')?.getAttribute("content");
    expect(viewport).toContain("width=device-width");
    // So the backdrop reaches under iOS Safari's status bar and toolbar.
    expect(viewport).toContain("viewport-fit=cover");
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
      expect(links[0]?.getAttribute("href")?.startsWith("https://ben-morrison.com/")).toBe(true);
      expect(head().querySelector('meta[name="robots"]')).toBeNull();
    });
  }

  it("contains its h1 and main body text without JavaScript", () => {
    const h1s = body().getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe(page.h1);
    expect(body().getByRole("main").textContent).toContain(page.bodyText);
  });

  it("has exactly one banner, Primary navigation, main and contentinfo landmark (and on docs pages, a Components navigation)", () => {
    expect(body().getAllByRole("banner")).toHaveLength(1);
    // hidden: jsdom's UA sheet hides the closed [popover] panel that holds Primary; the site's CSS,
    // which shows it on wide screens, isn't loaded here (site-refresh design §4.3).
    expect(body().getAllByRole("navigation", { hidden: true })).toHaveLength(
      "docs" in page ? 2 : 1,
    );
    expect(body().getByRole("navigation", { name: "Primary", hidden: true })).toBeTruthy();
    expect(body().getAllByRole("main")).toHaveLength(1);
    expect(body().getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("runs the pre-paint theme script before any stylesheet or body content (R13.4)", () => {
    const head = documentFor(page.file).head;
    const script = [...head.querySelectorAll("script:not([src])")].find((s) =>
      s.textContent.includes('localStorage.getItem("theme")'),
    );
    expect(script, "theme script").toBeDefined();
    for (const stylesheet of head.querySelectorAll('link[rel="stylesheet"], style')) {
      expect(script?.compareDocumentPosition(stylesheet), stylesheet.outerHTML).toBe(
        4 /* DOCUMENT_POSITION_FOLLOWING */,
      );
    }
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
