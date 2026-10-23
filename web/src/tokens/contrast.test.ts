import { describe, expect, it } from "vitest";
import {
  backgroundsOf,
  composite,
  contrastRatio,
  minimumRatio,
  pairingResults,
  relativeLuminance,
  worstCase,
  type ColorOf,
  type PaintedColor,
} from "./contrast.ts";
import type { Srgb } from "./types.ts";

function gray(byte: number): Srgb {
  const channel = byte / 255;
  return [channel, channel, channel];
}

const black = gray(0x00);
const white = gray(0xff);

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance(black)).toBe(0);
    expect(relativeLuminance(white)).toBe(1);
  });

  it("matches the WCAG formula for a mid gray", () => {
    expect(relativeLuminance(gray(0x77))).toBeCloseTo(0.1845, 4);
  });

  it("weights green most and blue least", () => {
    expect(relativeLuminance([1, 0, 0])).toBeCloseTo(0.2126, 4);
    expect(relativeLuminance([0, 1, 0])).toBeCloseTo(0.7152, 4);
    expect(relativeLuminance([0, 0, 1])).toBeCloseTo(0.0722, 4);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 10);
  });

  it("is about 4.48:1 for #777 on white", () => {
    expect(contrastRatio(gray(0x77), white)).toBeCloseTo(4.48, 2);
  });

  it("is 1:1 for identical colors", () => {
    expect(contrastRatio(gray(0x77), gray(0x77))).toBe(1);
  });

  it("is symmetric in argument order", () => {
    const blue: Srgb = [0x1d / 255, 0x4e / 255, 0xd8 / 255];
    expect(contrastRatio(blue, white)).toBe(contrastRatio(white, blue));
  });
});

describe("minimumRatio", () => {
  it("maps WCAG AA thresholds", () => {
    expect(minimumRatio).toEqual({ text: 4.5, "large-text": 3, "non-text": 3 });
  });
});

describe("composite", () => {
  it("is the backdrop at alpha 0 and the color itself at alpha 1", () => {
    expect(composite(white, 0, black)).toEqual(black);
    expect(composite(white, 1, black)).toEqual(white);
  });

  it("blends each gamma-encoded sRGB channel source-over, as browsers composite by default", () => {
    const [r, g, b] = composite([1, 0.5, 0], 0.25, [0, 0.5, 1]);
    expect(r).toBeCloseTo(0.25, 10);
    expect(g).toBeCloseTo(0.5, 10);
    expect(b).toBeCloseTo(0.75, 10);
  });

  it("reproduces the dark glass worst case from design §4.6 (subtle text about 4.08:1 over gold)", () => {
    const navy: Srgb = [0x12 / 255, 0x3e / 255, 0x5e / 255];
    const gold: Srgb = [0xef / 255, 0xd0 / 255, 0x9b / 255];
    const subtle: Srgb = [0xad / 255, 0xba / 255, 0xc8 / 255];
    expect(contrastRatio(subtle, composite(navy, 0.85, gold))).toBeCloseTo(4.08, 1);
  });
});

describe("pairing evaluation (theme-creator design §6)", () => {
  const gold: Srgb = [0xef / 255, 0xd0 / 255, 0x9b / 255];
  const colors: Record<string, PaintedColor> = {
    paper: { srgb: white, alpha: 1 },
    ink: { srgb: gray(0x77), alpha: 1 },
    gold: { srgb: gold, alpha: 1 },
    glass: { srgb: black, alpha: 0.5 },
  };
  const colorOf: ColorOf = (name) => {
    const color = colors[name];
    if (!color) throw new Error(`unknown ${name}`);
    return color;
  };

  it("composites a translucent background over each declared backdrop", () => {
    expect(backgroundsOf(colorOf, "glass", ["paper", "gold"])).toEqual([
      { srgb: composite(black, 0.5, white), backdrop: "paper" },
      { srgb: composite(black, 0.5, gold), backdrop: "gold" },
    ]);
    expect(backgroundsOf(colorOf, "paper")).toEqual([{ srgb: white }]);
  });

  it("refuses a translucent background without backdrops", () => {
    expect(() => backgroundsOf(colorOf, "glass")).toThrow(/declares no/);
  });

  it("chooses the backdrop giving the lowest ratio as the worst case", () => {
    const overPaper = contrastRatio(white, composite(black, 0.5, white));
    const overGold = contrastRatio(white, composite(black, 0.5, gold));
    expect(overPaper).toBeLessThan(overGold);

    expect(worstCase(colorOf, "paper", "glass", ["gold", "paper"])).toEqual({
      ratio: overPaper,
      backdrop: "paper",
    });
  });

  it("measures every declared pairing in token order, with its backdrop when translucent", () => {
    const results = pairingResults(colorOf, [
      { name: "ink", contrast: [{ against: "paper", min: "text" }] },
      { name: "glass", contrast: [], contrastBackdrop: ["gold", "paper"] },
      { name: "paper", contrast: [{ against: "glass", min: "non-text" }] },
    ]);

    expect(results).toEqual([
      { token: "ink", against: "paper", min: "text", ratio: contrastRatio(gray(0x77), white) },
      {
        token: "paper",
        against: "glass",
        min: "non-text",
        ratio: contrastRatio(white, composite(black, 0.5, white)),
        backdrop: "paper",
      },
    ]);
  });
});
