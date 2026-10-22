import { describe, expect, it } from "vitest";
import { referenceTokens, rowGroups } from "./groups.ts";
import { groupId, tierSections, tokenRowId, tokensToc } from "./reference-ids.ts";

describe("tokenRowId", () => {
  it("is the token path with dots as dashes", () => {
    expect(tokenRowId("color.text.muted")).toBe("color-text-muted");
    expect(tokenRowId("component.button.radius")).toBe("component-button-radius");
    expect(tokenRowId("space.4")).toBe("space-4");
  });

  it("is unique across all three tiers and the page's h2 ids (R6.4)", () => {
    const ids = [
      ...referenceTokens.map((token) => tokenRowId(token.name)),
      ...tokensToc.map((item) => item.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("tokensToc", () => {
  it("lists the eight h2s in page order, each id the slug of its label (R1.1, R1.2)", () => {
    expect(tokensToc).toEqual([
      { id: "naming", label: "Naming" },
      { id: "theming", label: "Theming" },
      { id: "usage", label: "Usage" },
      { id: "accessibility", label: "Accessibility" },
      { id: "find-a-token", label: "Find a token" },
      { id: "primitives", label: "Primitives" },
      { id: "semantic", label: "Semantic" },
      { id: "component", label: "Component" },
    ]);
    expect(tierSections.primitive.id).toBe("primitives");
  });
});

describe("rowGroups", () => {
  it("maps every token's row to its tier and category group", () => {
    expect(rowGroups.size).toBe(referenceTokens.length);
    for (const token of referenceTokens) {
      expect(rowGroups.get(tokenRowId(token.name))).toBe(groupId(token.tier, token.category));
    }
  });
});
