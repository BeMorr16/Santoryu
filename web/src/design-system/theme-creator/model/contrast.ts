import {
  minimumRatio,
  pairingResults,
  worstCase,
  type ColorOf,
  type PairingResult,
} from "../../../tokens/contrast.ts";
import { allTokens } from "../../../tokens/metadata.ts";
import { semanticByName } from "./builtin.ts";
import type { ResolvedTheme, ResolvedValue } from "./types.ts";

/**
 * Contrast in a resolved theme (theme-creator R3.3, R3.6; design §6): the declared pairings,
 * measured with the same `pairingResults` the built-in themes' test uses.
 */

/** A token's color in resolved values: a component token is its (re-pointed) semantic's. */
export function resolvedColorOf(
  semantic: Readonly<Record<string, ResolvedValue>>,
  component: Readonly<Record<string, string>> = {},
): ColorOf {
  return (name) => {
    const value = semantic[component[name] ?? name];
    if (value?.srgb === undefined) throw new Error(`${name} has no color`);
    return { srgb: value.srgb, alpha: value.alpha ?? 1 };
  };
}

/** Whether every pairing a semantic token declares passes with these colors. */
export function meetsPairings(token: string, colorOf: ColorOf): boolean {
  return worstRatio(token, colorOf) >= 1;
}

/**
 * The lowest of a semantic token's pairings' ratios, each divided by its minimum: 1 or more when
 * they all pass. Infinity when it declares none.
 */
export function worstRatio(token: string, colorOf: ColorOf): number {
  const pairings = semanticByName.get(token)?.contrast ?? [];
  return Math.min(
    ...pairings.map(
      ({ against, min }) =>
        worstCase(colorOf, token, against, semanticByName.get(against)?.contrastBackdrop).ratio /
        minimumRatio[min],
    ),
  );
}

/**
 * Every declared pairing in the theme, at its worst case. A component token is composited over
 * the backdrops of the semantic it now aliases, since a re-point can change it.
 */
export function themePairings(theme: ResolvedTheme): PairingResult[] {
  const tokens = allTokens.map((token) =>
    token.tier === "component"
      ? {
          ...token,
          contrastBackdrop: semanticByName.get(theme.component[token.name] ?? token.aliases)
            ?.contrastBackdrop,
        }
      : token,
  );
  return pairingResults(resolvedColorOf(theme.semantic, theme.component), tokens);
}

/** The pairings that fail: what Save lists, and the live count (R3.3, R3.6). */
export function failingPairings(theme: ResolvedTheme): PairingResult[] {
  return themePairings(theme).filter(({ ratio, min }) => ratio < minimumRatio[min]);
}
