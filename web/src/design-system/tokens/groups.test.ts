import { describe, expect, it } from "vitest";
import { componentTokens, semanticTokens } from "../../tokens/metadata.ts";
import { primitiveTokens } from "../../tokens/primitives.ts";
import { tokenCategories, type SemanticTokenMeta } from "../../tokens/types.ts";
import { componentPages } from "../components/pages.ts";
import { referenceGroups, tierGroups, type TokenGroup } from "./groups.ts";

const semantic = (name: string, category: SemanticTokenMeta["category"]): SemanticTokenMeta => ({
  tier: "semantic",
  name,
  cssVar: `--${name}`,
  category,
  type: "dimension",
  description: "",
  contrast: [],
  themed: false,
  values: { all: { css: "0", ref: "space.0" } },
});

describe("tierGroups", () => {
  it("orders groups by tokenCategories and drops empty categories (R4.2)", () => {
    const groups = tierGroups("semantic", [
      semantic("radius.a", "radius"),
      semantic("color.a", "color"),
      semantic("radius.b", "radius"),
    ]);

    expect(groups.map(({ id, category, tier }) => ({ id, category, tier }))).toEqual([
      { id: "semantic-color", category: "color", tier: "semantic" },
      { id: "semantic-radius", category: "radius", tier: "semantic" },
    ]);
    expect(groups[1]?.tokens.map((token) => token.name)).toEqual(["radius.a", "radius.b"]);
  });

  it("orders component tokens by side-menu order, then source order (R6.2)", () => {
    for (const group of referenceGroups.component) {
      const order = group.tokens.map((token) =>
        componentPages.findIndex(({ id }) => id === token.component),
      );
      expect(order).toEqual(order.toSorted((a, b) => a - b));
      const sourceOrder = componentTokens.filter((token) => token.category === group.category);
      for (const page of componentPages) {
        expect(group.tokens.filter((token) => token.component === page.id)).toEqual(
          sourceOrder.filter((token) => token.component === page.id),
        );
      }
    }
  });
});

describe("referenceGroups", () => {
  it("groups every token of each tier once, in category order", () => {
    const tiers = [
      ["primitive", primitiveTokens],
      ["semantic", semanticTokens],
      ["component", componentTokens],
    ] as const;
    for (const [tier, tokens] of tiers) {
      const groups: readonly TokenGroup[] = referenceGroups[tier];
      expect(groups.reduce((sum, group) => sum + group.tokens.length, 0)).toBe(tokens.length);
      const categories = groups.map((group) => group.category);
      expect(categories).toEqual(
        tokenCategories.filter((category) => categories.includes(category)),
      );
      expect(groups.every((group) => group.tokens.length > 0)).toBe(true);
    }
  });
});
