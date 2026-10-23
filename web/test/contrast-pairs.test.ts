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
    ["color.text.subtle", opaque, 4.85, 5.18],
    ["color.action.text", ["color.action.background"], 7.57, 10.8],
    ["color.border.strong", opaque, 3.57, 3.59],
    ["color.focus.ring", opaque, 6.87, 6.25],
    ["color.text.muted", ["color.surface.glass"], 5.78, 5.29],
  ] as const)("%s: light %s, dark %s, within 0.01", (fg, surfaces, light, dark) => {
    expect(Math.abs(worstOver(fg, [...surfaces], "light") - light)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(worstOver(fg, [...surfaces], "dark") - dark)).toBeLessThanOrEqual(0.01);
  });

  it("keeps text.subtle off glass: it would fail there in dark (about 4.08:1)", () => {
    const dark = colorIn("dark");
    const glass = byName.get("color.surface.glass")?.contrastBackdrop;
    const ratio = Math.min(
      ...backgroundsOf(dark, "color.surface.glass", glass).map((bg) =>
        contrastRatio(dark("color.text.subtle").srgb, bg.srgb),
      ),
    );
    expect(ratio).toBeLessThan(minimumRatio.text);
    expect(byName.get("color.text.subtle")?.contrast.map((p) => p.against)).not.toContain(
      "color.surface.glass",
    );
  });
});
