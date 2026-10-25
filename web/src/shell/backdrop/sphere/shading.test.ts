import { describe, expect, it } from "vitest";
import { BANDS } from "./geometry.ts";
import { bandStyles, rgba } from "./shading.ts";

const near = { r: 240, g: 240, b: 250, a: 1 };
const far = { r: 80, g: 200, b: 240, a: 1 };

/** The rgba() parts of a band's fill. */
const parts = (fill: string) => (/^rgba\((.+)\)$/.exec(fill)?.[1] ?? "").split(", ").map(Number);

describe("bandStyles (R2.5)", () => {
  const styles = bandStyles(near, far);

  it("has one style per band", () => {
    expect(styles).toHaveLength(BANDS);
  });

  it("follows the reference's radius and opacity ramps at the end bands", () => {
    for (const [index, style] of [
      [0, styles[0]],
      [BANDS - 1, styles.at(-1)],
    ] as const) {
      const d = (index + 0.5) / BANDS;
      expect(style?.radius).toBeCloseTo(0.35 + 1.45 * d);
      expect(parts(style?.fill ?? "")[3]).toBeCloseTo(0.05 + 0.85 * d ** 1.35, 3);
    }
  });

  it("runs the color from far at the back to near at the front", () => {
    const [backR, backG] = parts(styles[0]?.fill ?? "");
    const [frontR, frontG] = parts(styles.at(-1)?.fill ?? "");
    expect(backR).toBeLessThan(frontR ?? 0);
    expect(Math.abs((backR ?? 0) - far.r)).toBeLessThan(10);
    expect(Math.abs((frontR ?? 0) - near.r)).toBeLessThan(10);
    expect(backG).toBeLessThan(frontG ?? 0);
  });

  it("only grows in radius and opacity toward the front", () => {
    for (let index = 1; index < BANDS; index++) {
      expect(styles[index]?.radius).toBeGreaterThan(styles[index - 1]?.radius ?? 0);
      expect(parts(styles[index]?.fill ?? "")[3]).toBeGreaterThan(
        parts(styles[index - 1]?.fill ?? "")[3] ?? 0,
      );
    }
  });

  it("scales the opacity by a translucent token color", () => {
    const half = bandStyles({ ...near, a: 0.5 }, { ...far, a: 0.5 });
    expect(parts(half.at(-1)?.fill ?? "")[3]).toBeCloseTo(
      (parts(styles.at(-1)?.fill ?? "")[3] ?? 0) / 2,
      2,
    );
  });
});

describe("rgba", () => {
  it("writes a canvas fill at the given alpha, rounded to three places", () => {
    expect(rgba({ r: 1, g: 2, b: 3, a: 1 }, 0.123456)).toBe("rgba(1, 2, 3, 0.123)");
  });
});
