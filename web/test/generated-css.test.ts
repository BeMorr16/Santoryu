import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  componentTokens as component,
  semanticTokens as semantic,
} from "../src/tokens/metadata.ts";
import type { UnthemedTokenMeta } from "../src/tokens/types.ts";

const css = readFileSync(new URL("../src/generated/tokens.css", import.meta.url), "utf8");

interface Block {
  selector: string;
  body: string;
}

/** Splits a flat stylesheet into its top-level blocks, flattening one level of @media nesting. */
function blocks(source: string): Block[] {
  const result: Block[] = [];
  const pattern = /([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  for (const match of source.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(pattern)) {
    const selector = (match[1] ?? "").trim().replace(/\s+/g, " ");
    const body = match[2] ?? "";
    const inner = /([^{}]+)\{([^{}]*)\}/.exec(body);
    if (selector.startsWith("@media") && inner) {
      result.push({ selector: `${selector} ${(inner[1] ?? "").trim()}`, body: inner[2] ?? "" });
    } else {
      result.push({ selector, body });
    }
  }
  return result;
}

function declared(body: string): Map<string, string> {
  return new Map(
    [...body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)].map((m) => [
      m[1] ?? "",
      (m[2] ?? "").trim(),
    ]),
  );
}

const parsed = blocks(css);
const bySelector = new Map(parsed.map((block) => [block.selector, declared(block.body)]));
const rootDecls = bySelector.get(":root");
const darkMedia = bySelector.get(
  '@media (prefers-color-scheme: dark) :root:not([data-theme="light"])',
);
const darkAttr = bySelector.get('[data-theme="dark"]');
const lightAttr = bySelector.get('[data-theme="light"]');
const componentBlock = bySelector.get(":root, [data-theme]");
const reducedMotion = bySelector.get("@media (prefers-reduced-motion: reduce) :root");

const themed = semantic.filter((t) => t.themed);
// What a custom theme can change outside color: re-declared in each scoped theme (decision 0012).
const scopedReset = semantic.filter(
  (t): t is UnthemedTokenMeta =>
    !t.themed &&
    (["type", "space", "radius"].includes(t.category) || t.name === "effect.border.width"),
);
const durations = semantic.filter((t) => t.name.startsWith("motion.duration."));
const cssVars = (block: Map<string, string> | undefined) =>
  [...(block?.keys() ?? [])].filter((name) => name.startsWith("--")).sort();

describe("generated tokens.css", () => {
  it("has the selector and media-block structure from component-library design §4.4, in order", () => {
    expect(parsed.map((block) => block.selector)).toEqual([
      ":root",
      '@media (prefers-color-scheme: dark) :root:not([data-theme="light"])',
      '[data-theme="dark"]',
      '[data-theme="light"]',
      ":root, [data-theme]",
      "@media (prefers-reduced-motion: reduce) :root",
    ]);
  });

  it("sets color-scheme in each theme block", () => {
    expect(rootDecls?.get("color-scheme")).toBe("light");
    expect(darkMedia?.get("color-scheme")).toBe("dark");
    expect(darkAttr?.get("color-scheme")).toBe("dark");
    expect(lightAttr?.get("color-scheme")).toBe("light");
  });

  it("declares every semantic token in :root with its light or unthemed value, and nothing else", () => {
    expect(semantic.length).toBeGreaterThan(0);
    expect(cssVars(rootDecls)).toEqual(semantic.map((t) => t.cssVar).sort());
    for (const token of semantic) {
      const value = token.themed ? token.values.light.css : token.values.all.css;
      expect(rootDecls?.get(token.cssVar), token.cssVar).toBe(value);
    }
  });

  it("declares every themed token's dark value in both dark selectors", () => {
    expect(themed.length).toBeGreaterThan(0);
    for (const block of [darkMedia, darkAttr]) {
      for (const token of themed) {
        expect(block?.get(token.cssVar), token.cssVar).toBe(token.values.dark.css);
      }
    }
    expect(cssVars(darkMedia)).toEqual(themed.map((t) => t.cssVar).sort());
  });

  it("resets type, space, radius and border width in each scoped theme, and nothing else (decision 0012)", () => {
    expect(scopedReset.map((t) => t.category)).toEqual(
      expect.arrayContaining(["type", "space", "radius", "effect"]),
    );
    expect(scopedReset.some((t) => t.category === "motion")).toBe(false);
    for (const block of [darkAttr, lightAttr]) {
      expect(cssVars(block)).toEqual([...themed, ...scopedReset].map((t) => t.cssVar).sort());
      for (const token of scopedReset) {
        expect(block?.get(token.cssVar), token.cssVar).toBe(token.values.all.css);
      }
    }
  });

  it("declares the full light themed set under [data-theme=light], so a scoped panel can opt out of dark", () => {
    for (const token of themed) {
      expect(lightAttr?.get(token.cssVar), token.cssVar).toBe(token.values.light.css);
    }
  });

  it("declares every component token as var(--<semantic>) in `:root, [data-theme]`, and nothing else", () => {
    expect(component.length).toBeGreaterThan(0);
    expect(cssVars(componentBlock)).toEqual(component.map((t) => t.cssVar).sort());
    for (const token of component) {
      const target = semantic.find((t) => t.name === token.aliases);
      expect(target, `${token.name} aliases ${token.aliases}`).toBeDefined();
      expect(componentBlock?.get(token.cssVar), token.cssVar).toBe(`var(${target?.cssVar ?? ""})`);
    }
  });

  it("emits em values only for type.tracking tokens (the letter-spacing/em transform)", () => {
    for (const token of semantic) {
      const value = token.themed ? token.values.light.css : token.values.all.css;
      expect(/\dem$/.test(value), token.name).toBe(token.name.startsWith("type.tracking."));
    }
  });

  it("resolves every motion duration to its reduced value under prefers-reduced-motion", () => {
    expect(durations.length).toBeGreaterThan(0);
    expect([...(reducedMotion?.keys() ?? [])].sort()).toEqual(
      durations.map((t) => t.cssVar).sort(),
    );
    for (const token of durations) {
      const reduced = "reduced" in token.values ? token.values.reduced.css : undefined;
      expect(reduced, token.name).toBeDefined();
      expect(reducedMotion?.get(token.cssVar)).toBe(reduced);
    }
  });

  it("emits no primitive token names", () => {
    const primitivePrefixes =
      /^--(color-(gray|blue|gold|cyan|sand|overlay)-|type-(font-stack|font-size|font-weight|line-height|letter-spacing)-|space-\d|size-\d|radius-(\d|full)|motion-(time|curve)-|effect-(shadow|line|blur-radius)-)/;
    const emitted = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] ?? "");
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.filter((name) => primitivePrefixes.test(name))).toEqual([]);
  });
});
