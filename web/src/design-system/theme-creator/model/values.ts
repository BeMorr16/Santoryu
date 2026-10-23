import type { Srgb } from "../../../tokens/types.ts";
import { builtInValueOf } from "./builtin.ts";
import { hexToSrgb, srgbToHex } from "./oklch.ts";
import { fontIds, type FontId, type Hex, type ResolvedValue } from "./types.ts";

/** CSS values, written as tokens.css writes them (design §3.3), so equal values compare equal. */

const dimensionPattern = /^(-?\d*\.?\d+)(rem|px|ch|em)$/;

/** A number and its unit, from a value such as `1.5rem`; null for anything else. */
export function parseDimension(css: string): { value: number; unit: string } | null {
  const match = dimensionPattern.exec(css);
  return match ? { value: Number(match[1]), unit: match[2] ?? "" } : null;
}

/** A number rounded to `step`, written without float noise (0.1 + 0.2 → "0.3"). */
export function roundTo(value: number, step: number): number {
  const digits = Math.max(0, -Math.floor(Math.log10(step)));
  return Number((Math.round(value / step) * step).toFixed(digits));
}

/** Opaque colors as hex, translucent ones as rgba() with 8-bit channels (Style Dictionary's form). */
export function formatColor(srgb: Srgb, alpha: number): string {
  if (alpha === 1) return srgbToHex(srgb);
  const [r, g, b] = srgb.map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

/** A resolved color from a hex and an alpha; the hex is 8-bit, so so is its sRGB. */
export function colorValue(hex: Hex, alpha: number, ref?: string): ResolvedValue {
  const srgb = hexToSrgb(hex);
  return { css: formatColor(srgb, alpha), srgb, alpha, ...(ref === undefined ? {} : { ref }) };
}

/** The base stack for each family: the heading, body and code stacks (design §5.4). */
const stackTokens: Record<FontId, string> = {
  "space-grotesk": "type.family.heading",
  inter: "type.family.body",
  "fira-code": "type.family.code",
};

export function fontStack(font: FontId): string {
  // Type tokens aren't themed, so either theme gives the same stack.
  return builtInValueOf(stackTokens[font], "light").css;
}

/** Which family a font-family value is, if it's one of the three stacks. */
export function fontOf(css: string): FontId | undefined {
  return fontIds.find((font) => fontStack(font) === css);
}
