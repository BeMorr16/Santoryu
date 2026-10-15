import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "../src/generated/tokens.ts";

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
    const selector = (match[1] ?? "").trim();
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
const darkAttr = bySelector.get(':root[data-theme="dark"]');
const lightAttr = bySelector.get(':root[data-theme="light"]');
const reducedMotion = bySelector.get("@media (prefers-reduced-motion: reduce) :root");

const themed = tokens.filter((t) => t.themed);
const durations = tokens.filter((t) => t.name.startsWith("motion.duration."));

describe("generated tokens.css", () => {
  it("has the selector and media-block structure from design §4.5, in order", () => {
    expect(parsed.map((block) => block.selector)).toEqual([
      ":root",
      '@media (prefers-color-scheme: dark) :root:not([data-theme="light"])',
      ':root[data-theme="dark"]',
      ':root[data-theme="light"]',
      "@media (prefers-reduced-motion: reduce) :root",
    ]);
  });

  it("sets color-scheme in each theme block", () => {
    expect(rootDecls?.get("color-scheme")).toBe("light");
    expect(darkMedia?.get("color-scheme")).toBe("dark");
    expect(darkAttr?.get("color-scheme")).toBe("dark");
    expect(lightAttr?.get("color-scheme")).toBe("light");
  });

  it("declares every semantic token in :root with its light or unthemed value", () => {
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const value = token.themed ? token.values.light.css : token.values.all.css;
      expect(rootDecls?.get(token.cssVar), token.cssVar).toBe(value);
    }
  });

  it("declares every themed token's dark value in both dark selectors, and nothing else", () => {
    expect(themed.length).toBeGreaterThan(0);
    for (const block of [darkMedia, darkAttr]) {
      const vars = [...(block?.keys() ?? [])].filter((name) => name.startsWith("--"));
      expect(vars.sort()).toEqual(themed.map((t) => t.cssVar).sort());
      for (const token of themed) {
        expect(block?.get(token.cssVar), token.cssVar).toBe(token.values.dark.css);
      }
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
      /^--(color-(gray|blue)-|type-(font-stack|font-size|font-weight|line-height)-|space-\d|radius-(\d|full)|motion-(time|curve)-|effect-(shadow|line)-)/;
    const emitted = [...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] ?? "");
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.filter((name) => primitivePrefixes.test(name))).toEqual([]);
  });
});
