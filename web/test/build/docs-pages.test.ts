import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { within } from "@testing-library/dom";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import {
  componentPages,
  componentPath,
  componentsPath,
} from "../../src/design-system/components/pages.ts";
import { showcases } from "../../src/design-system/components/registry.ts";
import { siteUrl } from "../../src/site.config.ts";
import { fingerprint, scriptsOf } from "./page-scripts.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

/** The overview, then every component page (ds-components R1.1). */
const docsPages = [
  { path: componentsPath, title: "Components · Design System · Ben Morrison", h1: "Components" },
  ...componentPages.map(({ id, name }) => ({
    path: componentPath(id),
    title: `${name} · Components · Design System · Ben Morrison`,
    h1: name,
  })),
];

const fileOf = (path: string) => `${clientDir}${path.slice(1)}/index.html`;

function documentAt(path: string): Document {
  return new JSDOM(readFileSync(fileOf(path), "utf8")).window.document;
}

/** Every prerendered page, as served (HTML files other than the not-found page's twin). */
const htmlFiles = () =>
  readdirSync(clientDir, { recursive: true, encoding: "utf8" }).filter((path) =>
    path.endsWith(".html"),
  );

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe.each(docsPages)("$path", ({ path, title, h1 }) => {
  it("is prerendered as <path>/index.html with its title, a description and its canonical URL (R1.1, R1.5)", () => {
    expect(existsSync(fileOf(path))).toBe(true);
    const document = documentAt(path);
    expect(document.title).toBe(title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toMatch(
      /\S/,
    );
    const canonical = document.querySelectorAll('link[rel="canonical"]');
    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.getAttribute("href")).toBe(`${siteUrl}${path}`);
    expect(within(document.body).getByRole("heading", { level: 1 })).toHaveProperty(
      "textContent",
      h1,
    );
  });

  it("has a Primary and a Components navigation, uniquely labelled, with Components outside and before main (R2.1)", () => {
    const body = within(documentAt(path).body);
    // hidden: jsdom's UA sheet hides the closed [popover] panel that holds Primary; the site's CSS,
    // which shows it on wide screens, isn't loaded here (site-refresh design §4.3).
    const navs = body.getAllByRole("navigation", { hidden: true });
    const labels = navs.map((nav) => nav.getAttribute("aria-label"));
    expect(labels).toEqual(["Primary", "Components"]);
    const components = body.getByRole("navigation", { name: "Components" });
    const main = body.getByRole("main");
    expect(main.contains(components)).toBe(false);
    expect(components.compareDocumentPosition(main) & 4 /* FOLLOWING */).toBe(4);
  });

  it("lists On this page and previous/next as labelled lists, not landmarks (R4.2, R4.9)", () => {
    const body = within(documentAt(path).body);
    const toc = body.getByRole("list", { name: "On this page" });
    const prevNext = body.getByRole("list", { name: "Previous and next" });
    for (const list of [toc, prevNext]) {
      expect(list.tagName).toBe("UL");
      expect(list.closest("nav, aside, [role=navigation]")).toBeNull();
    }
  });
});

describe("every prerendered page (R4.8, site-foundation R3.8)", () => {
  it.each(htmlFiles())("%s has one h1 and no skipped heading levels", (file) => {
    const document = new JSDOM(readFileSync(`${clientDir}${file}`, "utf8")).window.document;
    const levels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
      Number(heading.tagName.slice(1)),
    );
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      expect(level, `heading ${String(index)}`).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
  });
});

describe("the /lab section (R1.2)", () => {
  it("is not prerendered", () => {
    expect(existsSync(`${clientDir}lab`)).toBe(false);
    expect(htmlFiles().filter((file) => file.startsWith("lab"))).toEqual([]);
  });
});

describe("per-page code splitting (R4.11)", () => {
  it.each(componentPages.map(({ id, name }) => [name, id] as const))(
    "%s's page loads its own examples and no other component's",
    (_name, id) => {
      const js = scriptsOf(componentPath(id));
      expect(js).toContain(fingerprint(showcases[id].purpose));
      for (const other of componentPages) {
        if (other.id === id) continue;
        expect(js, other.id).not.toContain(fingerprint(showcases[other.id].purpose));
      }
    },
  );
});
