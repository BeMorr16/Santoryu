export const tokenCategories = ["color", "type", "space", "radius", "motion", "effect"] as const;

export type TokenCategory = (typeof tokenCategories)[number];

/** sRGB components in the 0–1 range. */
export type Srgb = readonly [number, number, number];

export interface TokenValue {
  /** The resolved CSS value. */
  css: string;
  /** The primitive this value comes from, e.g. `color.gray.600`. */
  ref: string;
  srgb?: Srgb;
  alpha?: number;
}

export type ContrastMinimum = "text" | "large-text" | "non-text";

export interface ContrastPairing {
  against: string;
  min: ContrastMinimum;
}

interface TokenMetaBase {
  name: string;
  cssVar: `--${string}`;
  category: TokenCategory;
  type: string;
  description: string;
  contrast: readonly ContrastPairing[];
}

export interface ThemedTokenMeta extends TokenMetaBase {
  themed: true;
  values: { light: TokenValue; dark: TokenValue };
}

export interface UnthemedTokenMeta extends TokenMetaBase {
  themed: false;
  /** `reduced` is present on motion durations: the value under `prefers-reduced-motion: reduce`. */
  values: { all: TokenValue; reduced?: TokenValue };
}

export type TokenMeta = ThemedTokenMeta | UnthemedTokenMeta;
