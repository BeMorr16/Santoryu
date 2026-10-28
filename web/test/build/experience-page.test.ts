import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { experienceContent, positions, type Highlight } from "../../src/content/experience.ts";
import { resumePdfPath, siteUrl } from "../../src/site.config.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const experienceHtml = `${clientDir}experience/index.html`;
const pdfFile = `${clientDir}${resumePdfPath.slice(1)}`;

const highlights = positions.flatMap<Highlight>((position) => position.highlights);

let html: string;
let document: Document;

beforeAll(() => {
  if (!existsSync(clientDir)) throw new Error("No build output found. Run `pnpm run build` first.");
  html = readFileSync(experienceHtml, "utf8");
  // JSDOM runs no scripts by default, so this is the page as served, before hydration.
  document = new JSDOM(html).window.document;
});

describe("Experience page, prerendered (resume R1, R3, R7.10)", () => {
  const mainElement = () => document.querySelector("main") ?? document.body;
  const main = () => within(mainElement());
  const headingTexts = (level: number) =>
    main()
      .getAllByRole("heading", { level })
      .map((heading) => heading.textContent);

  it("is emitted as experience/index.html (R1.1)", () => {
    expect(existsSync(experienceHtml)).toBe(true);
  });

  it("has one h1 and the three h2s, in order (R3.1, R3.2)", () => {
    expect(headingTexts(1)).toEqual([experienceContent.heading]);
    expect(headingTexts(2)).toEqual([
      experienceContent.skillsHeading,
      experienceContent.workHeading,
      experienceContent.educationHeading,
    ]);
  });

  it("prerenders every position h3 and every highlight h4, in order (R7.10)", () => {
    const work = main().getByRole("region", { name: experienceContent.workHeading });
    expect(
      within(work)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(positions.map((position) => `${position.title}, ${position.company}`));
    expect(headingTexts(4)).toEqual(highlights.map((highlight) => highlight.title));
  });

  it("reads “Showing all N highlights” in the live region (R7.7, R7.10)", () => {
    const region = mainElement().querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe(experienceContent.count(highlights.length, highlights.length));
  });

  it("links the PDF for download (R10.2)", () => {
    const link = main().getByRole("link", { name: experienceContent.pdfLabel });
    expect(link.getAttribute("href")).toBe(resumePdfPath);
    expect(link.hasAttribute("download")).toBe(true);
    expect(link.hasAttribute("target")).toBe(false);
  });

  it("has no mailto: and no email address anywhere in the file (R11.4)", () => {
    expect(html).not.toContain("mailto:");
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it("links the canonical URL to /experience (R1.3)", () => {
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      `${siteUrl}/experience`,
    );
  });

  it("is listed in sitemap.xml (R1.1)", () => {
    expect(readFileSync(`${clientDir}sitemap.xml`, "utf8")).toContain(
      `<loc>${siteUrl}/experience</loc>`,
    );
  });
});

describe("résumé PDF (resume R10.1, R10.3)", () => {
  it("is published at the path the page links", () => {
    expect(existsSync(pdfFile)).toBe(true);
  });

  it("is a PDF: it starts with the %PDF- signature", () => {
    expect(readFileSync(pdfFile).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("is at most 1 MB", () => {
    expect(statSync(pdfFile).size).toBeLessThanOrEqual(1024 * 1024);
  });
});
