export const tokenCategories = [
  "color",
  "type",
  "space",
  "size",
  "radius",
  "motion",
  "effect",
] as const;

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
  /** For a component token, the category of the semantic token it aliases. */
  category: TokenCategory;
  type: string;
  description: string;
  contrast: readonly ContrastPairing[];
  /** Opaque surfaces a translucent background is composited over for contrast checks (§4.6). */
  contrastBackdrop?: readonly string[];
}

export interface ThemedTokenMeta extends TokenMetaBase {
  tier: "semantic";
  themed: true;
  values: { light: TokenValue; dark: TokenValue };
}

export interface UnthemedTokenMeta extends TokenMetaBase {
  tier: "semantic";
  themed: false;
  /** `reduced` is present on motion durations: the value under `prefers-reduced-motion: reduce`. */
  values: { all: TokenValue; reduced?: TokenValue };
}

export type SemanticTokenMeta = ThemedTokenMeta | UnthemedTokenMeta;

/** A component's styling hook: one alias to a semantic token, emitted as `var(--<semantic>)`. */
export interface ComponentTokenMeta extends TokenMetaBase {
  tier: "component";
  /** Kebab-case component directory name, e.g. `theme-switcher`. */
  component: string;
  /** Path of the semantic token this aliases. */
  aliases: string;
  /** The emitted CSS value: `var(--<semantic>)`. */
  css: `var(--${string})`;
  /** The aliased semantic token's resolved values. `reduced` mirrors the semantic's, if any. */
  values: { light: TokenValue; dark: TokenValue; reduced?: TokenValue };
}

export type TokenMeta = SemanticTokenMeta | ComponentTokenMeta;
