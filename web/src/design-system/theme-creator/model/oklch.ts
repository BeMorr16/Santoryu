import type { Hex } from "../../../components/ColorField/ColorField.tsx";
import type { Srgb } from "../../../tokens/types.ts";

/**
 * sRGB ⇄ OKLab ⇄ OKLCH (theme-creator design §5.1), with Björn Ottosson's published matrices
 * (https://bottosson.github.io/posts/oklab/). No color library: these are the whole conversions.
 */

/** OKLCH: lightness 0–1, chroma from 0, hue in degrees (0 when achromatic). */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toGamma = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

/** Gamma-encoded sRGB, 0–1 per channel. */
export function hexToSrgb(hex: Hex): Srgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** Lowercase `#rrggbb`, each channel clamped to 0–1 and rounded to 8 bits. */
export function srgbToHex(srgb: Srgb): Hex {
  const byte = (channel: number) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${srgb.map(byte).join("")}`;
}

export function srgbToOklch([r, g, b]: Srgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  // Hue is meaningless without chroma; 0 keeps it a number.
  const h = c < 1e-7 ? 0 : (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c, h: h < 0 ? h + 360 : h };
}

/** sRGB for an OKLCH color, possibly outside 0–1 when it's out of gamut. */
export function oklchToSrgb({ l: L, c, h }: Oklch): Srgb {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const epsilon = 1e-6;

export function inGamut(srgb: Srgb): boolean {
  return srgb.every((channel) => channel >= -epsilon && channel <= 1 + epsilon);
}

/**
 * The in-gamut sRGB color with this L and H, reducing chroma by binary search until it fits: the
 * CSS Color 4 approach, without its ΔE shortcut. L is clamped to 0–1.
 */
export function gamutMap(color: Oklch): Srgb {
  const l = Math.min(1, Math.max(0, color.l));
  const direct = oklchToSrgb({ ...color, l });
  if (inGamut(direct)) return direct;
  let low = 0;
  let high = color.c;
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToSrgb({ l, c: mid, h: color.h }))) low = mid;
    else high = mid;
  }
  return oklchToSrgb({ l, c: low, h: color.h });
}

export const hexToOklch = (hex: Hex): Oklch => srgbToOklch(hexToSrgb(hex));

export const oklchToHex = (color: Oklch): Hex => srgbToHex(gamutMap(color));
