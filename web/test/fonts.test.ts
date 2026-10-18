import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { semanticTokens } from "../src/tokens/metadata.ts";

const css = readFileSync(new URL("../src/styles/fonts.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

interface FontFace {
  family: string;
  descriptors: Map<string, string>;
}

const faces: FontFace[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => {
  const descriptors = new Map(
    [...(match[1] ?? "").matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [
      d[1] ?? "",
      (d[2] ?? "").replace(/\s+/g, " ").trim(),
    ]),
  );
  return { family: (descriptors.get("font-family") ?? "").replace(/"/g, ""), descriptors };
});

const webfonts = faces.filter((face) => face.descriptors.get("src")?.includes(".woff2"));
const fallbackFamily = (family: string) => family.replace(/ Variable$/, " Fallback");

describe("fonts.css", () => {
  it("declares the three webfont families", () => {
    expect(webfonts.map((face) => face.family)).toEqual([
      "Inter Variable",
      "Space Grotesk Variable",
      "Fira Code Variable",
    ]);
  });

  it.each(webfonts.map((face) => [face.family, face] as const))(
    "%s uses font-display: swap and its latin woff2 file only (R1.3, R1.4)",
    (_family, face) => {
      expect(face.descriptors.get("font-display")).toBe("swap");
      expect(face.descriptors.get("src")).toMatch(/-latin-wght-normal\.woff2"\) format\(/);
      expect(face.descriptors.get("unicode-range")).toMatch(/^U\+0000-00FF,/);
    },
  );

  it.each(webfonts.map((face) => [face.family, face] as const))(
    "%s has a local fallback face with all four metric overrides (R1.5)",
    (family) => {
      const fallback = faces.find((face) => face.family === fallbackFamily(family));
      expect(fallback, `${fallbackFamily(family)} face`).toBeDefined();
      expect(fallback?.descriptors.get("src")).toMatch(/^local\("[^"]+"\)$/);
      for (const override of [
        "size-adjust",
        "ascent-override",
        "descent-override",
        "line-gap-override",
      ]) {
        expect(fallback?.descriptors.get(override), override).toMatch(/^\d+(\.\d+)?%$/);
      }
    },
  );

  it.each(webfonts.map((face) => [face.family] as const))(
    "%s is used through a type.family token, followed by its fallback face (R1.7)",
    (family) => {
      const stacks = semanticTokens
        .filter((t) => t.name.startsWith("type.family."))
        .map((t) => (t.themed ? t.values.light.css : t.values.all.css));
      const quoted = (name: string) => `'${name}'`;
      expect(
        stacks.some((stack) =>
          stack.startsWith(`${quoted(family)}, ${quoted(fallbackFamily(family))},`),
        ),
      ).toBe(true);
    },
  );
});
