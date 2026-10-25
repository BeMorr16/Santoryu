import { allTokens, componentTokens, semanticTokens } from "../../tokens/metadata.ts";
import { primitiveTokens } from "../../tokens/primitives.ts";
import {
  tokenCategories,
  type AnyTokenMeta,
  type ComponentTokenMeta,
  type PrimitiveTokenMeta,
  type SemanticTokenMeta,
  type TokenCategory,
} from "../../tokens/types.ts";
import { componentPages } from "../components/pages.ts";
import { groupId, tokenRowId } from "./reference-ids.ts";

export type Tier = AnyTokenMeta["tier"];

/** One accordion item: one tier's tokens in one category (R4.2). */
export interface GroupOf<T extends AnyTokenMeta> {
  tier: T["tier"];
  category: TokenCategory;
  id: string;
  tokens: readonly T[];
}

/** A group of any tier, narrowed by `tier`. */
export type TokenGroup =
  GroupOf<PrimitiveTokenMeta> | GroupOf<SemanticTokenMeta> | GroupOf<ComponentTokenMeta>;

export const categoryLabels: Record<TokenCategory, string> = {
  color: "Color",
  type: "Type",
  space: "Space",
  size: "Size",
  radius: "Radius",
  motion: "Motion",
  effect: "Effect",
  layer: "Layer",
};

const pageOrder = (token: AnyTokenMeta) =>
  token.tier === "component" ? componentPages.findIndex(({ id }) => id === token.component) : 0;

/**
 * A tier's groups in `tokenCategories` order, without empty categories (R4.2). Component tokens
 * are in side-menu order, then source order (R6.2).
 */
export function tierGroups<T extends AnyTokenMeta>(
  tier: T["tier"],
  tokens: readonly T[],
): GroupOf<T>[] {
  const ordered = tokens.toSorted((a, b) => pageOrder(a) - pageOrder(b));
  return tokenCategories.flatMap((category) => {
    const inCategory = ordered.filter((token) => token.category === category);
    return inCategory.length > 0
      ? [{ tier, category, id: groupId(tier, category), tokens: inCategory }]
      : [];
  });
}

/** Every token on the page: primitives, then semantic and component tokens. */
export const referenceTokens: readonly AnyTokenMeta[] = [...primitiveTokens, ...allTokens];

/** The reference's groups, per tier. */
export const referenceGroups = {
  primitive: tierGroups("primitive", primitiveTokens),
  semantic: tierGroups("semantic", semanticTokens),
  component: tierGroups("component", componentTokens),
};

/** Each token row's group, by row id (ds-tokens design §7.1). */
export const rowGroups: ReadonlyMap<string, string> = new Map(
  Object.values(referenceGroups).flatMap((groups) =>
    groups.flatMap((group) =>
      group.tokens.map((token): [string, string] => [tokenRowId(token.name), group.id]),
    ),
  ),
);
