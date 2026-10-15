import { describe, expect, it } from "vitest";
import { contrastRatio, minimumRatio, relativeLuminance } from "./contrast.ts";
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
