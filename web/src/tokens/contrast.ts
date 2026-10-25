import type { ContrastMinimum, Srgb, TokenMeta } from "./types.ts";

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

/** A color as painted: sRGB plus alpha (1 for opaque). */
export interface PaintedColor {
  srgb: Srgb;
  alpha: number;
}

/** Looks up a token's color in one theme. */
export type ColorOf = (name: string) => PaintedColor;

/** One declared pairing, measured at its worst case. */
export interface PairingResult {
  token: string;
  against: string;
  min: ContrastMinimum;
  ratio: number;
  /** The opaque surface a translucent background was composited over for this worst case. */
  backdrop?: string | undefined;
}

function opaque(colorOf: ColorOf, name: string): Srgb {
  const { srgb, alpha } = colorOf(name);
  if (alpha !== 1) throw new Error(`${name} is translucent`);
  return srgb;
}

/**
 * Every color a background can actually show. An opaque background is itself; a translucent one
 * (glass) is composited over each opaque backdrop it declares (ds-tokens design §4.6).
 */
export function backgroundsOf(
  colorOf: ColorOf,
  name: string,
  backdrops: readonly string[] = [],
): { srgb: Srgb; backdrop?: string | undefined }[] {
  const { srgb, alpha } = colorOf(name);
  if (alpha === 1) return [{ srgb }];
  if (backdrops.length === 0) {
    throw new Error(`${name} is translucent but declares no personal-site.contrast-backdrop`);
  }
  return backdrops.map((backdrop) => ({
    srgb: composite(srgb, alpha, opaque(colorOf, backdrop)),
    backdrop,
  }));
}

/** The lowest ratio of an opaque foreground against every color its background can show. */
export function worstCase(
  colorOf: ColorOf,
  foreground: string,
  against: string,
  backdrops?: readonly string[],
): { ratio: number; backdrop?: string | undefined } {
  const fg = opaque(colorOf, foreground);
  return backgroundsOf(colorOf, against, backdrops)
    .map(({ srgb, backdrop }) => ({ ratio: contrastRatio(fg, srgb), backdrop }))
    .reduce((worst, current) => (current.ratio < worst.ratio ? current : worst));
}

/**
 * Every pairing the tokens declare (decision 0004), in token then pairing order, each measured at
 * its worst case. `colorOf` supplies the theme: a built-in one's metadata or a resolved custom one.
 */
export function pairingResults(
  colorOf: ColorOf,
  tokens: readonly (Pick<TokenMeta, "name" | "contrast"> & {
    contrastBackdrop?: readonly string[] | undefined;
  })[],
): PairingResult[] {
  const backdropsOf = new Map(tokens.map((token) => [token.name, token.contrastBackdrop]));
  return tokens.flatMap((token) =>
    token.contrast.map(({ against, min }) => {
      const worst = worstCase(colorOf, token.name, against, backdropsOf.get(against));
      return { token: token.name, against, min, ...worst };
    }),
  );
}
