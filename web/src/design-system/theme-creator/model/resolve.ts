import { componentTokens, semanticTokens } from "../../../tokens/metadata.ts";
import { builtInValue, builtInValueOf, semanticByName } from "./builtin.ts";
import { defaultKeys, deriveFamily, deriveKey, isDarkColor, nudge, pickOn } from "./derive.ts";
import { colorFamilies } from "./families.ts";
import { colorValue, fontStack } from "./values.ts";
import type {
  BuiltInTheme,
  KeyId,
  ResolvedTheme,
  ResolvedValue,
  ThemeSource,
  TokenValueInput,
  ValueSource,
} from "./types.ts";

/** A value set directly on one token (R6.1), in the form tokens.css writes it. */
export function overrideValue(
  token: string,
  input: TokenValueInput,
  base: BuiltInTheme,
): ResolvedValue {
  switch (input.kind) {
    case "color":
      // A translucent token keeps its base alpha (design §8.4).
      return colorValue(input.hex, builtInValueOf(token, base).alpha ?? 1, input.ref);
    case "dimension":
      return { css: `${String(input.value)}${input.unit}` };
    case "font":
      return { css: fontStack(input.font) };
    case "number":
      return {
        css: token.startsWith("type.tracking.") ? `${String(input.value)}em` : String(input.value),
      };
  }
}

const nonColorKeys = [
  "headingFont",
  "bodyFont",
  "typeScale",
  "radius",
  "borderWidth",
  "density",
] as const;

/**
 * A theme source as every semantic value, component alias and its color scheme (design §3.2):
 * base → keys → overrides → nudges (then text on fills) → scheme. A key left at its default leaves
 * its family exactly as the base has it, so an unchanged Light resolves to Light.
 */
export function resolveTheme(source: ThemeSource): ResolvedTheme {
  const { base } = source;
  const defaults = defaultKeys(base);
  const keys = { ...defaults, ...source.keys };
  const changed = (key: KeyId) =>
    source.keys[key] !== undefined && source.keys[key] !== defaults[key];

  // 1. Base.
  const semantic: Record<string, ResolvedValue> = {};
  const sources: Record<string, ValueSource> = {};
  for (const token of semanticTokens) {
    const { css, ref, srgb, alpha } = builtInValue(token, base);
    semantic[token.name] = {
      css,
      ref,
      ...(srgb && { srgb }),
      ...(alpha !== undefined && { alpha }),
    };
    sources[token.name] = "base";
  }
  const component: Record<string, string> = {};
  for (const token of componentTokens) {
    component[token.name] = token.aliases;
    sources[token.name] = "base";
  }

  // 2. Keys.
  const nudged = new Set<string>();
  const onTokens: string[] = [];
  for (const family of colorFamilies) {
    if (!changed(family.key)) continue;
    for (const [token, value] of deriveFamily(family, keys[family.key], base)) {
      semantic[token] = value;
      sources[token] = `key:${family.key}`;
    }
    for (const { token, role, nudge: shouldNudge } of family.members) {
      if (shouldNudge) nudged.add(token);
      if (role === "on") {
        onTokens.push(token);
        sources[token] = `key:${family.key}`;
      }
    }
  }
  for (const key of nonColorKeys) {
    if (!changed(key)) continue;
    for (const [token, value] of deriveKey(key, keys, base)) {
      semantic[token] = value;
      sources[token] = `key:${key}`;
    }
  }

  // 3. Overrides: they win, and are never nudged (R5.2, R6.3).
  for (const [token, input] of Object.entries(source.overrides.semantic)) {
    if (!semanticByName.has(token)) continue;
    semantic[token] = overrideValue(token, input, base);
    sources[token] = "edited";
    nudged.delete(token);
  }
  for (const [token, target] of Object.entries(source.overrides.component)) {
    if (!(token in component) || !semanticByName.has(target)) continue;
    component[token] = target;
    sources[token] = "edited";
  }

  // 4. Nudges, against the final backgrounds; then text on fills, from the final fills and text.
  for (const token of nudged) {
    const value = nudge(token, semantic);
    if (value) semantic[token] = value;
  }
  for (const token of onTokens) {
    if (sources[token] === "edited") continue;
    const candidates = [
      builtInValueOf(token, base),
      semantic["color.text.default"],
      semantic["color.text.inverse"],
    ].flatMap((value) => (value?.srgb ? [value] : []));
    const value = pickOn(token, candidates, semantic);
    if (value) semantic[token] = value;
  }

  // 5. Scheme, from the background (R2.5).
  const background = semantic["color.surface.base"]?.srgb;
  const scheme = background && isDarkColor(background) ? "dark" : "light";
  return { scheme, base, semantic, component, sources };
}
