import { describe, expect, it } from "vitest";
import { cardMenuItems, copyName, currentSection } from "./library.ts";

describe("copyName (theme-creator-controls R2.8, R4.5)", () => {
  it("adds “ copy” to a short name", () => {
    expect(copyName("Ocean")).toBe("Ocean copy");
  });

  it("cuts a 30-character name before adding “ copy”, keeping the result at 30", () => {
    const name = "A".repeat(30);

    expect(copyName(name)).toBe(`${"A".repeat(25)} copy`);
    expect(copyName(name)).toHaveLength(30);
  });

  it("is just “copy” for an empty name", () => {
    expect(copyName("   ")).toBe("copy");
  });

  it("cuts a name over 30 characters the same way", () => {
    expect(copyName("B".repeat(40))).toBe(`${"B".repeat(25)} copy`);
  });

  it("trims surrounding whitespace, and any left at the cut", () => {
    expect(copyName("  Ocean  ")).toBe("Ocean copy");
    expect(copyName(`${"C".repeat(24)} Deep`)).toBe(`${"C".repeat(24)} copy`);
  });
});

describe("cardMenuItems (R2.6)", () => {
  it("offers Use on site first while the theme isn't in use, with a separator before Delete", () => {
    expect(cardMenuItems({ inUse: false })).toEqual([
      "useOnSite",
      "duplicate",
      "rename",
      "separator",
      "delete",
    ]);
  });

  it("omits Use on site while the theme is in use", () => {
    expect(cardMenuItems({ inUse: true })).toEqual(["duplicate", "rename", "separator", "delete"]);
  });
});

describe("currentSection (R5.3)", () => {
  const tops = [100, 400, 900, 1500];

  it("is the first section while every heading is below the line", () => {
    expect(currentSection(tops, 50)).toBe(0);
  });

  it("is the last heading at or above the line", () => {
    expect(currentSection(tops, 100)).toBe(0);
    expect(currentSection(tops, 450)).toBe(1);
    expect(currentSection(tops, 900)).toBe(2);
  });

  it("is the last section once every heading is past the line", () => {
    expect(currentSection([-900, -600, -300, -50], 120)).toBe(3);
  });

  it("takes the later of headings with equal tops", () => {
    expect(currentSection([0, 0, 500, 800], 100)).toBe(1);
  });

  it("is the last section at the end of the page, wherever its heading is", () => {
    expect(currentSection(tops, 50, true)).toBe(3);
  });
});
