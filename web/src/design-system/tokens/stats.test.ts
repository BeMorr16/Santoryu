import { describe, expect, it } from "vitest";
import { tokens } from "../../generated/tokens.ts";
import { primitives } from "../../generated/primitives.ts";
import {
  namingExamples,
  pairingCount,
  reducedCount,
  themedCount,
  tierCounts,
  tierRules,
  tokenNamed,
} from "./stats.ts";

describe("stats", () => {
  it("counts each tier directly from the generated metadata (R2.2)", () => {
    expect(tierCounts).toEqual({
      primitive: primitives.length,
      semantic: tokens.filter((token) => token.tier === "semantic").length,
      component: tokens.filter((token) => token.tier === "component").length,
    });
  });

  it("counts themed, reduced-motion and contrast figures from the metadata (R3.2, R3.4)", () => {
    let themed = 0;
    let reduced = 0;
    let pairings = 0;
    for (const token of tokens) {
      pairings += token.contrast.length;
      if (token.tier !== "semantic") continue;
      if (token.themed) themed += 1;
      else if ("reduced" in token.values) reduced += 1;
    }

    expect(themedCount).toBe(themed);
    expect(reducedCount).toBe(reduced);
    expect(pairingCount).toBe(pairings);
    expect(themedCount).toBeGreaterThan(0);
    expect(reducedCount).toBeGreaterThan(0);
  });

  it("has one real naming example per tier (R3.1)", () => {
    expect(namingExamples.map((token) => token.tier)).toEqual([
      "primitive",
      "semantic",
      "component",
    ]);
  });

  it("has a rule for every tier", () => {
    expect(Object.keys(tierRules)).toEqual(["primitive", "semantic", "component"]);
  });

  it("throws for a token that doesn't exist", () => {
    expect(() => tokenNamed("color.nope")).toThrow(/color\.nope/);
  });
});
