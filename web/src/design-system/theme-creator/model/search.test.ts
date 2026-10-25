import { describe, expect, it } from "vitest";
import { tokenRowId } from "../../tokens/reference-ids.ts";
import { sectionComponents, sectionSemantics } from "./controls.ts";
import { editorIndex, editorMatches } from "./search.ts";

describe("the editor's Find a token (theme-creator R4.3)", () => {
  it("indexes every editor row once, grouped by its section's semantic or component disclosure", () => {
    const rows = [...Object.values(sectionSemantics), ...Object.values(sectionComponents)].flat();
    expect(editorIndex).toHaveLength(rows.length);

    const groupOf = (token: string) =>
      editorIndex.find(({ rowId }) => rowId === tokenRowId(token))?.groupId;
    expect(groupOf("color.text.default")).toBe("color-semantic");
    expect(groupOf("component.button.primary.background")).toBe("color-component");
    expect(groupOf("space.inset.md")).toBe("spacing-semantic");
    expect(groupOf("component.button.radius")).toBe("shape-component");
    expect(groupOf("type.size.h1")).toBe("typography-semantic");
  });

  it("finds rows and the disclosures holding them, or nothing for an empty query", () => {
    expect(editorMatches("  ")).toBeNull();

    const matches = editorMatches("border width");
    expect(matches?.rows.has(tokenRowId("effect.border.width"))).toBe(true);
    expect(matches?.disclosures).toEqual(new Set(["shape-semantic", "shape-component"]));
  });
});
