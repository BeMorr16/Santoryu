import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { contactContent } from "../../src/content/contact.ts";
import { githubUrl, linkedinUrl, siteUrl } from "../../src/site.config.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const contactHtml = `${clientDir}contact/index.html`;

let html: string;
let document: Document;

beforeAll(() => {
  if (!existsSync(clientDir)) throw new Error("No build output found. Run `pnpm run build` first.");
  html = readFileSync(contactHtml, "utf8");
  // JSDOM runs no scripts by default, so this is the contact page as served, before hydration.
  document = new JSDOM(html).window.document;
});

describe("contact page, prerendered (contact R1, R2)", () => {
  const mainElement = () => document.querySelector("main") ?? document.body;
  const main = () => within(mainElement());

  it("is emitted as contact/index.html (R1.1)", () => {
    expect(existsSync(contactHtml)).toBe(true);
  });

  it("has one h1 Contact, then the location line and the invitation, in order, in main (R2.1)", () => {
    const h1s = main().getAllByRole("heading", { level: 1 });
    expect(h1s.map((h1) => h1.textContent)).toEqual([contactContent.heading]);
    const text = mainElement().textContent;
    const positions = [
      contactContent.heading,
      contactContent.location,
      contactContent.invitation,
    ].map((copy) => text.indexOf(copy));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("links LinkedIn and GitHub (R2.3, R2.4)", () => {
    const href = (name: string) => main().getByRole("link", { name }).getAttribute("href");
    expect(href(contactContent.linkedinLabel)).toBe(linkedinUrl);
    expect(href(contactContent.githubLabel)).toBe(githubUrl);
  });

  it("has no mailto: and no email address anywhere in the file (R2.7)", () => {
    expect(html).not.toContain("mailto:");
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it("is listed in sitemap.xml (R1.1)", () => {
    expect(readFileSync(`${clientDir}sitemap.xml`, "utf8")).toContain(
      `<loc>${siteUrl}/contact</loc>`,
    );
  });

  it("links the canonical URL to /contact (R1.3)", () => {
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      `${siteUrl}/contact`,
    );
  });
});
