export const tokenCategories = [
  "color",
  "type",
  "space",
  "size",
  "radius",
  "motion",
  "effect",
  "layer",
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

/** A primitive: a literal value, documented but never emitted as a custom property (0004, 0011). */
export interface PrimitiveTokenMeta {
  tier: "primitive";
  /** e.g. `color.blue.600`. */
  name: string;
  category: TokenCategory;
  /** Second path segment, the ramp or scale it belongs to: `blue`, `font-size`, `4`. */
  group: string;
  type: string;
  description: string;
  /** The resolved CSS value, as a semantic token aliasing it would get. */
  css: string;
  srgb?: Srgb;
  alpha?: number;
  /** Semantic tokens aliasing it in any theme or under reduced motion, in metadata order. */
  usedBy: readonly string[];
}

export type AnyTokenMeta = TokenMeta | PrimitiveTokenMeta;
