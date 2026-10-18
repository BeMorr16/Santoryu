import { describe, expect, it } from "vitest";
import { allTokens as tokens } from "../src/tokens/metadata.ts";
import { composite, contrastRatio, minimumRatio } from "../src/tokens/contrast.ts";
import type { Srgb, TokenMeta, TokenValue } from "../src/tokens/types.ts";

const themes = ["light", "dark"] as const;
type Theme = (typeof themes)[number];

const byName = new Map<string, TokenMeta>(tokens.map((token) => [token.name, token]));

function valueIn(token: TokenMeta, theme: Theme): TokenValue {
  if (token.tier === "component" || token.themed) return token.values[theme];
  return token.values.all;
}

function opaqueColor(name: string, theme: Theme): Srgb {
  const token = byName.get(name);
  if (!token) throw new Error(`unknown token ${name}`);
  const value = valueIn(token, theme);
  if (!value.srgb) throw new Error(`${name} has no sRGB value`);
  if (value.alpha !== 1) throw new Error(`${name} is translucent in ${theme} (${value.ref})`);
  return value.srgb;
}

/**
 * Every color a background can actually show. An opaque background is itself; a translucent one
 * (glass) is composited over each opaque backdrop it declares (design §4.6).
 */
function backgroundsOf(name: string, theme: Theme): { label: string; srgb: Srgb }[] {
  const token = byName.get(name);
  if (!token) throw new Error(`unknown surface ${name}`);
  const value = valueIn(token, theme);
  if (!value.srgb) throw new Error(`${name} has no sRGB value`);
  const alpha = value.alpha ?? 1;
  if (alpha === 1) return [{ label: value.ref, srgb: value.srgb }];
  const backdrop = token.contrastBackdrop ?? [];
  if (backdrop.length === 0) {
    throw new Error(`${name} is translucent but declares no personal-site.contrast-backdrop`);
  }
  const srgb = value.srgb;
  return backdrop.map((under) => ({
    label: `${value.ref} over ${under}`,
    srgb: composite(srgb, alpha, opaqueColor(under, theme)),
  }));
}

function worstCase(foreground: string, against: string, theme: Theme) {
  const fg = opaqueColor(foreground, theme);
  return backgroundsOf(against, theme)
    .map((bg) => ({ label: bg.label, ratio: contrastRatio(fg, bg.srgb) }))
    .reduce((worst, current) => (current.ratio < worst.ratio ? current : worst));
}

const cases = themes.flatMap((theme) =>
  tokens.flatMap((token) =>
    token.contrast.map((pairing) => ({
      theme,
      token,
      pairing,
      label: `${theme}: ${token.name} on ${pairing.against} (${pairing.min})`,
    })),
  ),
);

describe("declared contrast pairings", () => {
  it("exist", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map((c) => [c.label, c] as const))("%s meets its minimum", (_label, c) => {
    const fg = valueIn(c.token, c.theme);
    const worst = worstCase(c.token.name, c.pairing.against, c.theme);
    expect(
      worst.ratio,
      `${fg.ref} on ${worst.label} is ${worst.ratio.toFixed(2)}:1, needs ${String(minimumRatio[c.pairing.min])}:1`,
    ).toBeGreaterThanOrEqual(minimumRatio[c.pairing.min]);
  });
});

describe("measured worst cases (design §4.1)", () => {
  const worstOver = (foreground: string, surfaces: string[], theme: Theme) =>
    Math.min(...surfaces.map((surface) => worstCase(foreground, surface, theme).ratio));
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
    const ratio = Math.min(
      ...backgroundsOf("color.surface.glass", "dark").map((bg) =>
        contrastRatio(opaqueColor("color.text.subtle", "dark"), bg.srgb),
      ),
    );
    expect(ratio).toBeLessThan(minimumRatio.text);
    expect(byName.get("color.text.subtle")?.contrast.map((p) => p.against)).not.toContain(
      "color.surface.glass",
    );
  });
});
