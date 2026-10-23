import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { componentPages, componentPath } from "../../src/design-system/components/pages.ts";
import { referenceTokens } from "../../src/design-system/tokens/groups.ts";
import { tokenRowId, tokensToc } from "../../src/design-system/tokens/reference-ids.ts";
import { primitiveTokens } from "../../src/tokens/primitives.ts";
import { scriptsOf } from "./page-scripts.ts";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));
const tokensDir = fileURLToPath(new URL("../../tokens/", import.meta.url));
const generatedCss = fileURLToPath(new URL("../../src/generated/tokens.css", import.meta.url));

const fileOf = (path: string) => `${clientDir}${path.slice(1)}/index.html`;
const documentAt = (path: string) => new JSDOM(readFileSync(fileOf(path), "utf8")).window.document;

/** A string only primitive metadata carries: color.blue.600's description, from its source. */
function primitiveMarker(): string {
  const source = JSON.parse(readFileSync(`${tokensDir}color.json`, "utf8")) as {
    color: { blue: { "600": { $description: string } } };
  };
  return source.color.blue["600"].$description;
}

beforeAll(() => {
  if (!existsSync(clientDir)) {
    throw new Error("No build output found. Run `pnpm run build` first.");
  }
});

describe("/design-system/tokens, prerendered (ds-tokens R12.2)", () => {
  it("has the flow diagram: a figure with a caption and four tiers", () => {
    const figure = documentAt("/design-system/tokens").querySelector("main figure");

    expect(figure?.querySelector("figcaption")?.textContent).toMatch(/How a value reaches/);
    expect(figure?.querySelectorAll(":scope > ol > li")).toHaveLength(4);
  });

  it("has the eight h2s, with their ids", () => {
    const h2s = [...documentAt("/design-system/tokens").querySelectorAll("main h2")];

    expect(h2s.map((h2) => [h2.id, h2.textContent])).toEqual(
      tokensToc.map(({ id, label }) => [id, label]),
    );
  });

  it("prerenders every group closed, its panel hidden (R4.4)", () => {
    const document = documentAt("/design-system/tokens");
    const triggers = [...document.querySelectorAll("main h3 > button[aria-controls]")];

    expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
      expect(panel?.hasAttribute("hidden")).toBe(true);
    }
  });

  it("has the token search in a search landmark named by its h2, before the Primitives h2 (R11.1)", () => {
    const document = documentAt("/design-system/tokens");
    const landmark = document.querySelector('main search[aria-labelledby="find-a-token"]');

    expect(landmark?.querySelector("h2#find-a-token")).not.toBeNull();

    expect(landmark?.querySelector('input[type="search"]')).not.toBeNull();
    expect(landmark?.querySelector('[role="status"]')).not.toBeNull();
    const primitives = document.getElementById("primitives");
    expect(primitives && landmark?.compareDocumentPosition(primitives)).toBe(4 /* FOLLOWING */);
  });

  it("prerenders every token's row exactly once (R4.6)", () => {
    const document = documentAt("/design-system/tokens");
    const ids = [...document.querySelectorAll("main [id]")].map((element) => element.id);

    for (const token of referenceTokens) {
      expect(
        ids.filter((id) => id === tokenRowId(token.name)),
        token.name,
      ).toHaveLength(1);
    }
  });
});

describe("the CSP's style rules (ds-tokens R2.11)", () => {
  it("leaves no <style> element in any prerendered page", () => {
    const pages = readdirSync(clientDir, { recursive: true, encoding: "utf8" }).filter((file) =>
      file.endsWith(".html"),
    );

    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) {
      expect(readFileSync(`${clientDir}${file}`, "utf8"), file).not.toMatch(/<style[\s>]/i);
    }
  });
});

describe("primitive metadata (ds-tokens R5.1, R9.3)", () => {
  it("adds no primitive custom property to tokens.css", () => {
    const css = readFileSync(generatedCss, "utf8");

    for (const { name } of primitiveTokens) {
      expect(css, name).not.toContain(`--${tokenRowId(name)}:`);
    }
  });

  it("is loaded by the tokens page", () => {
    expect(scriptsOf("/design-system/tokens")).toContain(primitiveMarker());
  });

  it.each(componentPages.map(({ id }) => componentPath(id)))("isn't loaded by %s", (path) => {
    expect(scriptsOf(path)).not.toContain(primitiveMarker());
  });
});
