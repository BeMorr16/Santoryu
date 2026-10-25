import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { namedColors } from "../../../test/named-colors.ts";

/**
 * R3.2: every backdrop color comes from the color.backdrop tokens. The CSS is covered by
 * css-token-usage.test.ts; this checks the strings in the backdrop's code. Tests are left out, since
 * they use stand-in values. Building `rgba(` from numbers (shading.ts) passes: only literal color
 * values are flagged.
 */
function colorLiterals(source: string): string[] {
  const strings = [...source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(
    (match) => match[2] ?? "",
  );
  return strings.flatMap((text) => [
    ...[...text.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(([hex]) => hex),
    ...[...text.matchAll(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[\d.]/gi)].map(
      ([fn]) => fn,
    ),
    ...[...text.matchAll(/(?<![\w-])[a-z]+(?![\w-])/gi)]
      .map(([word]) => word)
      .filter((word) => namedColors.has(word.toLowerCase())),
  ]);
}

const files = globSync("src/shell/backdrop/**/*.{ts,tsx}", {
  exclude: (file) => /\.test\.tsx?$/.test(file),
});

describe("backdrop code has no color literals (R3.2)", () => {
  it("finds the backdrop's code", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s", (file) => {
    expect(colorLiterals(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("flags hex, functional and named colors, but not a color built from numbers", () => {
    expect(colorLiterals('const a = "#5eead4"; const b = `rgba(1, 2, 3, 0.5)`;')).toEqual([
      "#5eead4",
      "rgba(1",
    ]);
    expect(colorLiterals('fill = "teal"; fill = "oklch(0.7 0.1 200)";')).toEqual([
      "teal",
      "oklch(0",
    ]);
    expect(
      colorLiterals('const fill = `rgba(${String(r)}, 0, 0, 1)`; probe.fillStyle = "transparent";'),
    ).toEqual([]);
  });
});
