import { allTokens, semanticTokens } from "../../tokens/metadata.ts";
import { primitiveTokens } from "../../tokens/primitives.ts";
import type { AnyTokenMeta } from "../../tokens/types.ts";
import { referenceTokens, type Tier } from "./groups.ts";

/** Each tier's token count, for the diagram (R2.2). */
export const tierCounts: Record<Tier, number> = {
  primitive: primitiveTokens.length,
  semantic: semanticTokens.length,
  component: allTokens.length - semanticTokens.length,
};

/** Each tier's rule, worded once for the diagram and the tier sections (R2.2, R4.1). */
export const tierRules: Record<Tier, string> = {
  primitive: "Raw values, named by scale. Never used directly.",
  semantic: "Named by purpose. Each aliases one primitive, and themes override them.",
  component: "One component's styling hooks. Each aliases one semantic token, in every theme.",
};

/** Semantic tokens with a light and a dark value (R3.2). */
export const themedCount = semanticTokens.filter((token) => token.themed).length;

/** Semantic tokens that reduced motion overrides (R3.2). */
export const reducedCount = semanticTokens.filter(
  (token) => !token.themed && token.values.reduced !== undefined,
).length;

/** Declared contrast pairings, each measured in both themes by contrast-pairs.test.ts (R3.4). */
export const pairingCount = allTokens.reduce((sum, token) => sum + token.contrast.length, 0);

/** The token with this path, in any tier. Throws so a renamed example fails tests and prerender. */
export function tokenNamed(name: string, tokens = referenceTokens): AnyTokenMeta {
  const token = tokens.find((candidate) => candidate.name === name);
  if (!token) throw new Error(`No token named ${name}`);
  return token;
}

/** One real token per tier, for Naming (R3.1). */
export const namingExamples: readonly AnyTokenMeta[] = [
  "color.gold.600",
  "color.text.muted",
  "component.button.radius",
].map((name) => tokenNamed(name));
