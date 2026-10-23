import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { semanticTokens } from "../../../tokens/metadata.ts";
import { worstCase } from "../../../tokens/contrast.ts";
import { builtInValueOf } from "./builtin.ts";
import { resolvedColorOf, worstRatio } from "./contrast.ts";
import { defaultKeys } from "./derive.ts";
import { colorFamilies, keyTokens } from "./families.ts";
import { hexToOklch, srgbToOklch } from "./oklch.ts";
import { resolveTheme } from "./resolve.ts";
import { fontStack } from "./values.ts";
import { themeVars } from "./vars.ts";
import type { BuiltInTheme, KeyValues, ThemeSource, TokenValueInput } from "./types.ts";

const css = readFileSync(new URL("../../../generated/tokens.css", import.meta.url), "utf8");

/** The custom properties a top-level block declares, by its exact selector. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...body.matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map((match): [string, string] => [
      match[1] ?? "",
      match[2] ?? "",
    ]),
  );
}

/** tokens.css's value for every semantic and component property in a built-in theme. */
const builtInCss = (theme: BuiltInTheme) => ({
  ...block(":root"),
  ...block(`[data-theme="${theme}"]`),
  ...block(":root,\n[data-theme]"),
});

const source = (
  base: BuiltInTheme,
  keys: Partial<KeyValues> = {},
  semantic: Record<string, TokenValueInput> = {},
  component: Record<string, string> = {},
): ThemeSource => ({ base, keys, overrides: { semantic, component } });

const lightness = (theme: ReturnType<typeof resolveTheme>, token: string) => {
  const srgb = theme.semantic[token]?.srgb;
  if (!srgb) throw new Error(`${token} has no color`);
  return srgbToOklch(srgb).l;
};

/** The lowest ratio of a text token against the three opaque surfaces. */
const onSurfaces = (theme: ReturnType<typeof resolveTheme>, token: string) => {
  const colorOf = resolvedColorOf(theme.semantic, theme.component);
  return Math.min(
    ...["color.surface.base", "color.surface.raised", "color.surface.sunken"].map(
      (surface) => worstCase(colorOf, token, surface).ratio,
    ),
  );
};

/** Hues within a few degrees: 8-bit rounding moves a hue that far at the ends of lightness. */
const expectHue = (actual: number | undefined, expected: number) => {
  const difference = Math.abs((((actual ?? Number.NaN) - expected + 540) % 360) - 180);
  expect(difference).toBeLessThan(3);
};

/** Whether all of a token's declared pairings pass in the theme. */
const passes = (theme: ReturnType<typeof resolveTheme>, token: string) =>
  worstRatio(token, resolvedColorOf(theme.semantic, theme.component)) >= 1;

describe("resolveTheme: identity (design §3.2)", () => {
  it.each(["light", "dark"] as const)(
    "resolves %s with default keys and no overrides to exactly the built-in theme",
    (base) => {
      for (const keys of [{}, defaultKeys(base)]) {
        const theme = resolveTheme(source(base, keys));

        expect(theme.scheme).toBe(base);
        expect(themeVars(theme, "diff")).toEqual({});
        expect(themeVars(theme, "full")).toEqual(builtInCss(base));
        expect(Object.values(theme.sources).every((value) => value === "base")).toBe(true);
      }
    },
  );

  it("starts each key at the base's value", () => {
    expect(defaultKeys("light")).toEqual({
      action: "#185480",
      accent: "#c49a4e",
      accent2: "#5b3fa6",
      background: "#fbf8f2",
      headingFont: "space-grotesk",
      bodyFont: "inter",
      typeScale: 1,
      radius: 4,
      borderWidth: 1,
      density: 0.25,
    });
    expect(defaultKeys("dark").background).toBe("#123e5e");
  });
});

describe("resolveTheme: color families (R5.1–R5.3)", () => {
  const changedKeys = { action: "#2a8556", accent: "#b25a12", accent2: "#c8372c" } as const;

  it.each(["light", "dark"] as const)(
    "keeps each key exactly, and marks its family as from that key (%s)",
    (base) => {
      const theme = resolveTheme(source(base, changedKeys));

      expect(theme.semantic["color.action.background"]?.css).toBe("#2a8556");
      expect(theme.semantic["color.accent.border"]?.css).toBe("#b25a12");
      expect(theme.semantic["color.accent-2.border"]?.css).toBe("#c8372c");
      for (const family of colorFamilies.filter(({ key }) => key !== "background")) {
        for (const { token } of family.members) {
          expect(theme.sources[token], token).toBe(`key:${family.key}`);
        }
      }
      expect(theme.sources["color.surface.base"]).toBe("base");
    },
  );

  it.each(["light", "dark"] as const)("keeps hover's direction from rest (%s)", (base) => {
    const builtIn = resolveTheme(source(base));
    const theme = resolveTheme(source(base, { action: "#2a8556" }));
    const step = (resolved: typeof theme) =>
      lightness(resolved, "color.action.background-hover") -
      lightness(resolved, "color.action.background");

    expect(Math.sign(step(theme))).toBe(Math.sign(step(builtIn)));
    expect(step(theme)).toBeCloseTo(step(builtIn), 2);
  });

  it.each(["light", "dark"] as const)(
    "nudges derived text until its pairings pass, keeping its hue (%s)",
    (base) => {
      // A pale action color: links at its own lightness would fail on the light surfaces.
      const theme = resolveTheme(source(base, { action: "#87c0e8", accent2: "#d9cdf7" }));

      for (const token of [
        "color.link.default",
        "color.link.hover",
        "color.link.visited",
        "color.accent-2.text",
      ]) {
        expect(passes(theme, token), token).toBe(true);
        const srgb = theme.semantic[token]?.srgb;
        const key = token.includes("visited") || token.includes("accent-2") ? "#d9cdf7" : "#87c0e8";
        expectHue(srgb && srgbToOklch(srgb).h, hexToOklch(key).h);
      }
    },
  );

  it.each(["light", "dark"] as const)(
    "picks text on a fill that meets its pairings (%s)",
    (base) => {
      for (const action of ["#87c0e8", "#0b2338", "#c49a4e"] as const) {
        const theme = resolveTheme(source(base, { action }));
        const text = theme.semantic["color.action.text"]?.css;

        expect(passes(theme, "color.action.text"), action).toBe(true);
        expect([
          builtInValueOf("color.action.text", base).css,
          theme.semantic["color.text.default"]?.css,
          theme.semantic["color.text.inverse"]?.css,
        ]).toContain(text);
      }
    },
  );

  it("keeps a translucent member's alpha", () => {
    const theme = resolveTheme(source("light", { background: "#f4f0fd" }));

    expect(theme.semantic["color.surface.glass"]?.alpha).toBe(0.85);
    expect(theme.semantic["color.surface.glass"]?.css).toMatch(/^rgba\(\d+, \d+, \d+, 0\.85\)$/);
    expect(theme.semantic["color.grid.line"]?.alpha).toBe(0.08);
  });
});

describe("resolveTheme: background and scheme (R2.5, R5.3)", () => {
  it("flips a light base to dark for a dark background, mirroring the text", () => {
    const theme = resolveTheme(source("light", { background: "#0b2338" }));

    expect(theme.scheme).toBe("dark");
    expect(theme.semantic["color.surface.base"]?.css).toBe("#0b2338");
    expect(lightness(theme, "color.text.default")).toBeGreaterThan(
      lightness(theme, "color.surface.base"),
    );
    expect(lightness(theme, "color.surface.inverse")).toBeGreaterThan(0.6);
    // Mirrored: text that was darker than the page is now lighter, and reads on the surfaces.
    for (const token of ["color.text.default", "color.text.muted", "color.text.subtle"]) {
      expect(lightness(theme, token), token).toBeGreaterThan(0.6);
      expect(onSurfaces(theme, token), token).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the scheme for a background of the same lightness class, tinting neutrals toward it", () => {
    const theme = resolveTheme(source("light", { background: "#f4f0fd" }));

    expect(theme.scheme).toBe("light");
    const sunken = theme.semantic["color.surface.sunken"]?.srgb;
    expectHue(sunken && srgbToOklch(sunken).h, hexToOklch("#f4f0fd").h);
    expect(passes(theme, "color.text.default")).toBe(true);
  });

  it("flips a dark base to light for a light background", () => {
    const theme = resolveTheme(source("dark", { background: "#fbf8f2" }));

    expect(theme.scheme).toBe("light");
    expect(lightness(theme, "color.text.default")).toBeLessThan(0.5);
    expect(onSurfaces(theme, "color.text.default")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("resolveTheme: typography, shape and spacing (R5.4–R5.6, design §5.4)", () => {
  it("scales the sizes above 1rem from the type scale, leaving the rest", () => {
    const theme = resolveTheme(source("light", { typeScale: 1.2 }));

    expect(theme.semantic["type.size.h1"]?.css).toBe("2.8rem");
    expect(theme.semantic["type.size.display"]?.css).toBe("3.4rem");
    expect(theme.semantic["type.size.lead"]?.css).toBe("1.3rem");
    for (const size of ["body", "small", "label", "h5", "h6"]) {
      expect(theme.semantic[`type.size.${size}`]?.css).toBe(
        builtInValueOf(`type.size.${size}`, "light").css,
      );
    }
    expect(theme.sources["type.size.h2"]).toBe("key:typeScale");
  });

  it("sets the fonts to the chosen families' stacks", () => {
    const theme = resolveTheme(source("dark", { headingFont: "inter", bodyFont: "fira-code" }));

    expect(theme.semantic["type.family.heading"]?.css).toBe(fontStack("inter"));
    expect(theme.semantic["type.family.body"]?.css).toBe(fontStack("fira-code"));
    expect(theme.semantic["type.family.code"]?.css).toBe(fontStack("fira-code"));
  });

  it("sets control and surface radius, leaving pill", () => {
    const theme = resolveTheme(source("light", { radius: 12 }));

    expect(theme.semantic["radius.control"]?.css).toBe("12px");
    expect(theme.semantic["radius.surface"]?.css).toBe("12px");
    expect(theme.semantic["radius.pill"]?.css).toBe("9999px");
  });

  it("sets the border width", () => {
    expect(
      resolveTheme(source("light", { borderWidth: 2 })).semantic["effect.border.width"]?.css,
    ).toBe("2px");
  });

  it("scales every space token with density", () => {
    const theme = resolveTheme(source("light", { density: 0.3 }));
    const space = semanticTokens.filter((token) => token.category === "space");

    expect(keyTokens.density).toEqual(space.map((token) => token.name));
    expect(theme.semantic["space.inset.md"]?.css).toBe("1.2rem");
    expect(theme.semantic["space.stack.xs"]?.css).toBe("0.3rem");
    expect(resolveTheme(source("light", { density: 0.2 })).semantic["space.layout.lg"]?.css).toBe(
      "3.2rem",
    );
  });
});

describe("resolveTheme: overrides (R6.3)", () => {
  const failing = { kind: "color", hex: "#c9b8f5" } as const;

  it("lets an override beat its key, and never nudges it", () => {
    const theme = resolveTheme(
      source("light", { action: "#87c0e8" }, { "color.link.default": failing }),
    );

    expect(theme.semantic["color.link.default"]?.css).toBe("#c9b8f5");
    expect(theme.sources["color.link.default"]).toBe("edited");
    expect(passes(theme, "color.link.default")).toBe(false);
  });

  it("restores the derived value when the override is removed", () => {
    const edited = resolveTheme(
      source("light", { action: "#87c0e8" }, { "color.link.default": failing }),
    );
    const reset = resolveTheme(source("light", { action: "#87c0e8" }));

    expect(edited.semantic["color.link.default"]?.css).toBe("#c9b8f5");
    expect(reset.semantic["color.link.default"]?.css).not.toBe("#c9b8f5");
    expect(reset.sources["color.link.default"]).toBe("key:action");
    expect(passes(reset, "color.link.default")).toBe(true);
  });

  it("writes each override kind as tokens.css would", () => {
    const theme = resolveTheme(
      source(
        "light",
        {},
        {
          "color.surface.glass": { kind: "color", hex: "#ffffff" },
          "space.inset.md": { kind: "dimension", value: 1.125, unit: "rem" },
          "type.family.body": { kind: "font", font: "space-grotesk" },
          "type.weight.body": { kind: "number", value: 500 },
          "type.tracking.label": { kind: "number", value: 0.2 },
          "type.measure.text": { kind: "dimension", value: 70, unit: "ch" },
        },
      ),
    );

    expect(themeVars(theme, "diff")).toEqual({
      "--color-surface-glass": "rgba(255, 255, 255, 0.85)",
      "--space-inset-md": "1.125rem",
      "--type-family-body": fontStack("space-grotesk"),
      "--type-weight-body": "500",
      "--type-tracking-label": "0.2em",
      "--type-measure-text": "70ch",
    });
  });

  it("re-points a component token to another semantic", () => {
    const theme = resolveTheme(
      source("light", {}, {}, { "component.button.primary.background": "color.accent.border" }),
    );

    expect(theme.component["component.button.primary.background"]).toBe("color.accent.border");
    expect(theme.sources["component.button.primary.background"]).toBe("edited");
    expect(themeVars(theme, "diff")).toEqual({
      "--component-button-primary-background": "var(--color-accent-border)",
    });
  });

  it("ignores overrides of unknown tokens", () => {
    const theme = resolveTheme(
      source("light", {}, { "color.nope": failing }, { "component.nope": "color.text.default" }),
    );

    expect(themeVars(theme, "diff")).toEqual({});
  });
});

describe("themeVars (design §3.3)", () => {
  it("diffs against the built-in theme with the resolved scheme", () => {
    const theme = resolveTheme(source("light", { background: "#123e5e" }));

    expect(theme.scheme).toBe("dark");
    // The key equals Dark's surface, so it's no difference from Dark.
    expect(themeVars(theme, "diff")["--color-surface-base"]).toBeUndefined();
  });
});
