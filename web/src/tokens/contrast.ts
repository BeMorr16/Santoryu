import type { ContrastMinimum, Srgb } from "./types.ts";

export const minimumRatio: Record<ContrastMinimum, number> = {
  text: 4.5,
  "large-text": 3,
  "non-text": 3,
};

function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance([r, g, b]: Srgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.x contrast ratio, from 1 to 21. Symmetric in argument order. */
export function contrastRatio(a: Srgb, b: Srgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * A translucent color painted over an opaque backdrop (source-over). Browsers composite in
 * gamma-encoded sRGB by default, so this blends the encoded channels, not linear light.
 */
export function composite(color: Srgb, alpha: number, backdrop: Srgb): Srgb {
  const [r, g, b] = color.map((channel, i) => alpha * channel + (1 - alpha) * (backdrop[i] ?? 0));
  return [r ?? 0, g ?? 0, b ?? 0];
}
