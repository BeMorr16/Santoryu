import { describe, expect, it } from "vitest";
import type { AnyTokenMeta } from "../../tokens/types.ts";
import { matchRows, searchIndex } from "./search.ts";

const tokens: AnyTokenMeta[] = [
  {
    tier: "primitive",
    name: "color.blue.700",
    category: "color",
    group: "blue",
    type: "color",
    description: "Brand blue.",
    css: "#185480",
    dtcg: { colorSpace: "srgb", components: [0.0941, 0.3294, 0.502], alpha: 1, hex: "#185480" },
    usedBy: ["color.action.background"],
  },
  {
    tier: "semantic",
    name: "color.text.muted",
    cssVar: "--color-text-muted",
    category: "color",
    type: "color",
    description: "Secondary text.",
    contrast: [],
    themed: true,
    values: {
      light: { css: "#455464", ref: "color.gray.700" },
      dark: { css: "#c5d3e0", ref: "color.gray.200" },
    },
  },
  {
    tier: "component",
    name: "component.button.radius",
    cssVar: "--component-button-radius",
    category: "radius",
    type: "dimension",
    description: "Corner rounding.",
    contrast: [],
    component: "button",
    aliases: "radius.control",
    css: "var(--radius-control)",
    values: {
      light: { css: "0.25rem", ref: "radius.4" },
      dark: { css: "0.25rem", ref: "radius.4" },
    },
  },
];

const index = searchIndex(tokens);
const match = (query: string) => {
  const rows = matchRows(index, query);
  return rows === null ? null : [...rows];
};

describe("searchIndex", () => {
  it("gives each token its row and group id", () => {
    expect(index.map(({ rowId, groupId }) => [rowId, groupId])).toEqual([
      ["color-blue-700", "primitive-color"],
      ["color-text-muted", "semantic-color"],
      ["component-button-radius", "component-radius"],
    ]);
  });
});

describe("matchRows (ds-tokens R11.2)", () => {
  it("returns null for an empty or blank query: no filter", () => {
    expect(match("")).toBeNull();
    expect(match("   ")).toBeNull();
  });

  it("ignores case", () => {
    expect(match("MUTED")).toEqual(["color-text-muted"]);
  });

  it("needs every term, each in any field", () => {
    expect(match("text secondary")).toEqual(["color-text-muted"]);
    expect(match("text tertiary")).toEqual([]);
  });

  it.each([
    ["path", "color.text", ["color-text-muted"]],
    ["CSS variable", "--color-text", ["color-text-muted"]],
    ["description", "corner", ["component-button-radius"]],
    ["resolved value", "#c5d3e0", ["color-text-muted"]],
    ["primitive value", "#185480", ["color-blue-700"]],
    ["primitive reference", "gray.200", ["color-text-muted"]],
    ["alias", "radius.control", ["component-button-radius"]],
    ["component name", "Button", ["component-button-radius"]],
  ])("matches a token's %s", (_field, query, rows) => {
    expect(match(query)).toEqual(rows);
  });

  it("never matches a term across two fields", () => {
    // The path ends "muted" and the CSS variable starts "--color": no one field holds both.
    expect(match("muted--color")).toEqual([]);
    expect(match("muted --color")).toEqual(["color-text-muted"]);
  });
});
