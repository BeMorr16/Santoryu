import type { ColorOf } from "../../../tokens/contrast.ts";
import type { Srgb, TokenValue } from "../../../tokens/types.ts";
import { builtInValueOf } from "./builtin.ts";
import { resolvedColorOf, meetsPairings, worstRatio } from "./contrast.ts";
import { keyTokens, type ColorFamily } from "./families.ts";
import { hexToOklch, oklchToHex, srgbToHex, srgbToOklch, type Oklch } from "./oklch.ts";
import { colorValue, fontOf, fontStack, parseDimension, roundTo } from "./values.ts";
import type { BuiltInTheme, Hex, KeyId, KeyValues, ResolvedValue } from "./types.ts";

/** Key derivation (theme-creator R5; design §5). Pure: everything here is a function of its inputs. */

/** A background is dark below this OKLCH lightness (R2.5). */
export const darkBelow = 0.6;

function srgbOf(value: TokenValue | ResolvedValue): Srgb {
  if (!value.srgb) throw new Error(`${value.css} isn't a color`);
  return value.srgb;
}

const baseHex = (name: string, base: BuiltInTheme): Hex =>
  srgbToHex(srgbOf(builtInValueOf(name, base)));

const baseNumber = (name: string, base: BuiltInTheme): number =>
  parseDimension(builtInValueOf(name, base).css)?.value ?? 0;

/**
 * Each key's value in a built-in theme, so a key control always shows one and a source never
 * stores what equals the base (design §3.1).
 */
export function defaultKeys(base: BuiltInTheme): KeyValues {
  return {
    action: baseHex("color.action.background", base),
    accent: baseHex("color.accent.border", base),
    accent2: baseHex("color.accent-2.border", base),
    background: baseHex("color.surface.base", base),
    headingFont: fontOf(builtInValueOf("type.family.heading", base).css) ?? "space-grotesk",
    bodyFont: fontOf(builtInValueOf("type.family.body", base).css) ?? "inter",
    typeScale: 1,
    radius: baseNumber("radius.control", base),
    borderWidth: baseNumber("effect.border.width", base),
    density: 0.25,
  };
}

export const isDarkColor = (srgb: Srgb) => srgbToOklch(srgb).l < darkBelow;

/**
 * A color family's members, from its key (design §5.3), before nudges. `on` members are left out:
 * they're chosen last, from the final fills and text.
 */
export function deriveFamily(
  family: ColorFamily,
  key: Hex,
  base: BuiltInTheme,
): Map<string, ResolvedValue> {
  const k = hexToOklch(key);
  const anchor = srgbToOklch(srgbOf(builtInValueOf(family.anchor, base)));
  // Only the background can flip the scheme: then neutrals mirror around it.
  const flipped = family.key === "background" && k.l < darkBelow !== (base === "dark");
  const derived = new Map<string, ResolvedValue>();
  for (const { token, role } of family.members) {
    const baseValue = builtInValueOf(token, base);
    const alpha = baseValue.alpha ?? 1;
    const m = srgbToOklch(srgbOf(baseValue));
    const chroma = k.c * (anchor.c > 0 ? Math.min(1, m.c / anchor.c) : 1);
    const step = m.l - anchor.l;
    const color = ((): Oklch | Hex | null => {
      switch (role) {
        case "key":
          return key;
        case "shade":
          return { l: k.l + step, c: k.c, h: k.h };
        case "tint":
          return { l: m.l, c: chroma, h: k.h };
        case "text":
          return { l: m.l, c: k.c, h: k.h };
        case "neutral":
          return {
            l: Math.min(1, Math.max(0, flipped ? k.l - step : k.l + step)),
            c: chroma,
            h: k.h,
          };
        case "on":
          return null;
      }
    })();
    if (color !== null) {
      derived.set(token, colorValue(typeof color === "string" ? color : oklchToHex(color), alpha));
    }
  }
  return derived;
}

const nudgeStep = 0.005;

/**
 * The closest lightness, at the same hue and chroma, where every pairing `token` declares passes
 * against `colors` (design §5.3). Scans outward from its own lightness, alternating up and down;
 * if none passes, the value is kept and Save reports it.
 */
export function nudge(
  token: string,
  colors: Readonly<Record<string, ResolvedValue>>,
): ResolvedValue | undefined {
  const value = colors[token];
  if (value?.srgb === undefined) return value;
  const others = resolvedColorOf(colors);
  const passes = (candidate: ResolvedValue): boolean => {
    const colorOf: ColorOf = (name) =>
      name === token ? { srgb: srgbOf(candidate), alpha: candidate.alpha ?? 1 } : others(name);
    return meetsPairings(token, colorOf);
  };
  if (passes(value)) return value;
  const start = srgbToOklch(value.srgb);
  const alpha = value.alpha ?? 1;
  for (let step = 1; step * nudgeStep <= 1; step++) {
    for (const l of [start.l + step * nudgeStep, start.l - step * nudgeStep]) {
      if (l < 0 || l > 1) continue;
      const candidate = colorValue(oklchToHex({ ...start, l }), alpha);
      if (passes(candidate)) return candidate;
    }
  }
  return value;
}

/**
 * Text on a fill (`on`): the first candidate meeting every pairing, or else the one with the
 * highest worst-case ratio (design §5.3).
 */
export function pickOn(
  token: string,
  candidates: readonly ResolvedValue[],
  colors: Readonly<Record<string, ResolvedValue>>,
): ResolvedValue | undefined {
  const others = resolvedColorOf(colors);
  const score = (candidate: ResolvedValue) =>
    worstRatio(token, (name) =>
      name === token ? { srgb: srgbOf(candidate), alpha: candidate.alpha ?? 1 } : others(name),
    );
  const scored = candidates.map((candidate) => ({ candidate, score: score(candidate) }));
  const passing = scored.find(({ score: ratio }) => ratio >= 1);
  return (passing ?? scored.toSorted((a, b) => b.score - a.score)[0])?.candidate;
}

/** A rem value multiplied, as tokens.css would write it. */
const rem = (value: number, step: number) => `${String(roundTo(value, step))}rem`;

/** The tokens a typography, shape or spacing key sets (design §5.4). */
export function deriveKey(
  key: Exclude<KeyId, "action" | "accent" | "accent2" | "background">,
  keys: KeyValues,
  base: BuiltInTheme,
): Map<string, ResolvedValue> {
  const css = (token: string): string => {
    const current = baseNumber(token, base);
    switch (key) {
      case "headingFont":
        return fontStack(keys.headingFont);
      case "bodyFont":
        return fontStack(keys.bodyFont);
      case "typeScale":
        return rem(1 + (current - 1) * keys.typeScale, 0.001);
      case "radius":
        return `${String(keys.radius)}px`;
      case "borderWidth":
        return `${String(keys.borderWidth)}px`;
      case "density":
        return rem(current * (keys.density / 0.25), 0.0001);
    }
  };
  return new Map(keyTokens[key].map((token) => [token, { css: css(token) }]));
}
