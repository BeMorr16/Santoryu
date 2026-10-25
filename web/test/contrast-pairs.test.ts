import { describe, expect, it } from "vitest";
import { allTokens as tokens } from "../src/tokens/metadata.ts";
import {
  backgroundsOf,
  contrastRatio,
  minimumRatio,
  pairingResults,
  worstCase,
  type ColorOf,
} from "../src/tokens/contrast.ts";
import type { TokenMeta, TokenValue } from "../src/tokens/types.ts";

const themes = ["light", "dark"] as const;
type Theme = (typeof themes)[number];

const byName = new Map<string, TokenMeta>(tokens.map((token) => [token.name, token]));

function valueIn(token: TokenMeta, theme: Theme): TokenValue {
  if (token.tier === "component" || token.themed) return token.values[theme];
  return token.values.all;
}

function colorIn(theme: Theme): ColorOf {
  return (name) => {
    const token = byName.get(name);
    if (!token) throw new Error(`unknown token ${name}`);
    const value = valueIn(token, theme);
    if (!value.srgb || value.alpha === undefined) throw new Error(`${name} has no sRGB value`);
    return { srgb: value.srgb, alpha: value.alpha };
  };
}

const cases = themes.flatMap((theme) =>
  pairingResults(colorIn(theme), tokens).map((result) => ({
    theme,
    result,
    label: `${theme}: ${result.token} on ${result.against} (${result.min})`,
  })),
);

describe("declared contrast pairings", () => {
  it("exist", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((c) => [c.label, c] as const))("%s meets its minimum", (_label, c) => {
    const { token, against, backdrop, ratio, min } = c.result;
    const fg = byName.get(token);
    const bg = byName.get(against);
    if (!fg || !bg) throw new Error(`unknown pairing ${c.label}`);
    const over = backdrop === undefined ? "" : ` over ${backdrop}`;
    expect(
      ratio,
      `${valueIn(fg, c.theme).ref} on ${valueIn(bg, c.theme).ref}${over} is ${ratio.toFixed(2)}:1, needs ${String(minimumRatio[min])}:1`,
    ).toBeGreaterThanOrEqual(minimumRatio[min]);
  });
});

describe("dark theme contrast (site-refresh R3.6)", () => {
  it("keeps every text pairing in dark at 7:1 or more", () => {
    const low = cases
      .filter(({ theme, result }) => theme === "dark" && result.min === "text" && result.ratio < 7)
      .map(({ label, result }) => `${label}: ${result.ratio.toFixed(2)}:1`);
    expect(low).toEqual([]);
  });
});

describe("measured worst cases (design §4.1)", () => {
  const worstOver = (foreground: string, surfaces: string[], theme: Theme) =>
    Math.min(
      ...surfaces.map(
        (surface) =>
          worstCase(colorIn(theme), foreground, surface, byName.get(surface)?.contrastBackdrop)
            .ratio,
      ),
    );
  const opaque = ["color.surface.base", "color.surface.raised", "color.surface.sunken"];

  it.each([
    ["color.text.subtle", opaque, 4.85, 11.79],
    ["color.action.text", ["color.action.background"], 5.09, 15.51],
    ["color.border.strong", opaque, 3.57, 4.76],
    ["color.focus.ring", opaque, 6.15, 9.73],
    ["color.text.muted", ["color.surface.glass"], 6.19, 13.33],
  ] as const)("%s: light %s, dark %s, within 0.01", (fg, surfaces, light, dark) => {
    expect(Math.abs(worstOver(fg, [...surfaces], "light") - light)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(worstOver(fg, [...surfaces], "dark") - dark)).toBeLessThanOrEqual(0.01);
  });

  it("keeps text.subtle off glass: it only just passes there in light (about 4.52:1)", () => {
    const light = colorIn("light");
    const glass = byName.get("color.surface.glass")?.contrastBackdrop;
    const ratio = Math.min(
      ...backgroundsOf(light, "color.surface.glass", glass).map((bg) =>
        contrastRatio(light("color.text.subtle").srgb, bg.srgb),
      ),
    );
    expect(Math.abs(ratio - 4.52)).toBeLessThanOrEqual(0.01);
    expect(byName.get("color.text.subtle")?.contrast.map((p) => p.against)).not.toContain(
      "color.surface.glass",
    );
  });
});
