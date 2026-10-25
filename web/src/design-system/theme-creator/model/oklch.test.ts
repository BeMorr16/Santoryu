import { describe, expect, it } from "vitest";
import type { Srgb } from "../../../tokens/types.ts";
import {
  gamutMap,
  hexToOklch,
  hexToSrgb,
  inGamut,
  oklchToHex,
  oklchToSrgb,
  srgbToHex,
  srgbToOklch,
} from "./oklch.ts";

describe("OKLCH (theme-creator R5.2, design §5.1)", () => {
  // Reference values from colorjs.io 0.5.2 (by the CSS Color 4 editors), new Color(hex).to("oklch"),
  // computed 2026-10-23. Its matrices are derived from XYZ, so they differ from Ottosson's direct
  // sRGB matrices only far past these tolerances.
  it.each([
    ["#ffffff", 1, 0, null],
    ["#000000", 0, 0, null],
    ["#185480", 0.430841, 0.094279, 245.157375],
    ["#c49a4e", 0.710022, 0.106631, 80.441816],
    ["#123e5e", 0.351, 0.073146, 244.408828],
  ] as const)("converts %s to its published OKLCH", (hex, l, c, h) => {
    const color = hexToOklch(hex);

    expect(color.l).toBeCloseTo(l, 3);
    expect(color.c).toBeCloseTo(c, 3);
    if (h !== null) expect(color.h).toBeCloseTo(h, 1);
  });

  it("reads and writes hex", () => {
    expect(hexToSrgb("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(srgbToHex([1, 128 / 255, 0])).toBe("#ff8000");
    expect(srgbToHex([1.2, -0.1, 0.5])).toBe("#ff0080");
  });

  it("round-trips sRGB → OKLCH → sRGB within 1/255 per channel over a 5×5×5 grid", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          const srgb: Srgb = [r, g, b];
          const back = oklchToSrgb(srgbToOklch(srgb));
          back.forEach((channel, index) => {
            expect(Math.abs(channel - (srgb[index] ?? 0)), String(srgb)).toBeLessThan(1 / 255);
          });
        }
      }
    }
  });

  it("maps an out-of-gamut color into sRGB, keeping its L and H", () => {
    const vivid = { l: 0.6, c: 0.4, h: 145 };
    expect(inGamut(oklchToSrgb(vivid))).toBe(false);

    const mapped = gamutMap(vivid);
    expect(inGamut(mapped)).toBe(true);
    const back = srgbToOklch(mapped);
    expect(back.l).toBeCloseTo(0.6, 3);
    expect(back.h).toBeCloseTo(145, 0);
    expect(back.c).toBeLessThan(0.4);
    expect(back.c).toBeGreaterThan(0.1);
  });

  it("leaves an in-gamut color as it is, and clamps lightness", () => {
    const blue = hexToOklch("#185480");
    expect(oklchToHex(blue)).toBe("#185480");
    expect(oklchToHex({ l: 1.4, c: 0.2, h: 30 })).toBe("#ffffff");
    expect(oklchToHex({ l: -0.2, c: 0.2, h: 30 })).toBe("#000000");
  });
});
