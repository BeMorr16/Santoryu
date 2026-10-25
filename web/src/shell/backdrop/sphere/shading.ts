import { BANDS } from "./geometry.ts";

/** A color as sRGB bytes (0–255) and alpha (0–1). */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface BandStyle {
  /** Dot radius, in CSS px. */
  radius: number;
  /** The band's fill, as an `rgba()` string. */
  fill: string;
}

/** A canvas fill for `color` at `alpha`. */
export function rgba({ r, g, b }: Rgba, alpha: number): string {
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(Math.round(alpha * 1000) / 1000)})`;
}

/**
 * BANDS styles at each band's mid-depth d (R2.5, the reference's ramps): radius 0.35 + 1.45d,
 * opacity 0.05 + 0.85d^1.35, and the color mixed from `far` to `near` linearly in sRGB, as the
 * reference does. A translucent token color scales the opacity.
 */
export function bandStyles(near: Rgba, far: Rgba): readonly BandStyle[] {
  return Array.from({ length: BANDS }, (_, index) => {
    const d = (index + 0.5) / BANDS;
    const mix = (from: number, to: number) => from + (to - from) * d;
    const color = {
      r: Math.round(mix(far.r, near.r)),
      g: Math.round(mix(far.g, near.g)),
      b: Math.round(mix(far.b, near.b)),
      a: mix(far.a, near.a),
    };
    return { radius: 0.35 + 1.45 * d, fill: rgba(color, color.a * (0.05 + 0.85 * d ** 1.35)) };
  });
}
