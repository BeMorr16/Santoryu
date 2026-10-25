import type { Hex } from "../../../components/ColorField/ColorField.tsx";
import type { BuiltInTheme } from "../../../theme/apply-theme.ts";
import type { Srgb } from "../../../tokens/types.ts";

export type { BuiltInTheme, Hex };

/** The three self-hosted families (theme-creator R5.4). */
export const fontIds = ["space-grotesk", "inter", "fira-code"] as const;
export type FontId = (typeof fontIds)[number];

/** The key controls (R5): each derives a family of semantic tokens. */
export interface KeyValues {
  action: Hex;
  accent: Hex;
  accent2: Hex;
  background: Hex;
  headingFont: FontId;
  bodyFont: FontId;
  /** 0.75–1.5, step 0.05; 1 is the base's sizes. */
  typeScale: number;
  /** px, 0–24, step 1. */
  radius: number;
  /** px, 1–4, step 1. */
  borderWidth: number;
  /** rem, 0.1875–0.3125, step 0.0125; 0.25 is the base's spacing. */
  density: number;
}

export type KeyId = keyof KeyValues;

/** Every key, in the editor's order. */
export const keyIds = [
  "action",
  "accent",
  "accent2",
  "background",
  "headingFont",
  "bodyFont",
  "typeScale",
  "radius",
  "borderWidth",
  "density",
] as const satisfies readonly KeyId[];

/** A value set on one token directly (R6). */
export type TokenValueInput =
  /** `ref`: the primitive, when it was picked from a swatch. */
  | { kind: "color"; hex: Hex; ref?: string | undefined }
  | { kind: "dimension"; value: number; unit: "rem" | "px" | "ch" }
  | { kind: "font"; font: FontId }
  /** Weights and leading (unitless), and tracking (em). */
  | { kind: "number"; value: number };

/**
 * Every theme: a built-in base plus changes (design §3.1). A theme started from another copies
 * its source, so nothing depends on the theme it came from.
 */
export interface ThemeSource {
  base: BuiltInTheme;
  /** Absent: the base's own value. */
  keys: Partial<KeyValues>;
  overrides: {
    /** Semantic path → its value. */
    semantic: Readonly<Record<string, TokenValueInput>>;
    /** Component path → the semantic path it aliases instead. */
    component: Readonly<Record<string, string>>;
  };
}

/** A resolved semantic value, in the form tokens.css writes it. */
export interface ResolvedValue {
  css: string;
  srgb?: Srgb | undefined;
  alpha?: number | undefined;
  /** The primitive it comes from: the base's, or a picked swatch's. */
  ref?: string | undefined;
}

/** Where a value came from: the starting point, a key control, or a direct edit. */
export type ValueSource = "base" | `key:${KeyId}` | "edited";

export interface ResolvedTheme {
  /** From the background's lightness (R2.5). */
  scheme: BuiltInTheme;
  base: BuiltInTheme;
  /** Every semantic token. */
  semantic: Readonly<Record<string, ResolvedValue>>;
  /** Every component token → the semantic it aliases. */
  component: Readonly<Record<string, string>>;
  /** Every semantic and component token's source. */
  sources: Readonly<Record<string, ValueSource>>;
}
