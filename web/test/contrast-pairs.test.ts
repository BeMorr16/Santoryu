import { describe, expect, it } from "vitest";
import { tokens } from "../src/generated/tokens.ts";
import { contrastRatio, minimumRatio } from "../src/tokens/contrast.ts";
import type { TokenMeta, TokenValue } from "../src/tokens/types.ts";

const themes = ["light", "dark"] as const;
type Theme = (typeof themes)[number];

const byName = new Map<string, TokenMeta>(tokens.map((token) => [token.name, token]));

function valueIn(token: TokenMeta, theme: Theme): TokenValue {
  return token.themed ? token.values[theme] : token.values.all;
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
    const background = byName.get(c.pairing.against);
    expect(background, `unknown surface ${c.pairing.against}`).toBeDefined();
    if (!background) return;

    const fg = valueIn(c.token, c.theme);
    const bg = valueIn(background, c.theme);
    expect(fg.srgb, `${c.token.name} has no sRGB value`).toBeDefined();
    expect(bg.srgb, `${background.name} has no sRGB value`).toBeDefined();
    if (!fg.srgb || !bg.srgb) return;

    const ratio = contrastRatio(fg.srgb, bg.srgb);
    expect(
      ratio,
      `${fg.ref} on ${bg.ref} is ${ratio.toFixed(2)}:1, needs ${String(minimumRatio[c.pairing.min])}:1`,
    ).toBeGreaterThanOrEqual(minimumRatio[c.pairing.min]);
  });
});
