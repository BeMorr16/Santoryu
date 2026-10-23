import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../../tokens/contrast.ts";
import { hexToSrgb } from "./oklch.ts";
import { failingPairings, themePairings } from "./contrast.ts";
import { resolveTheme } from "./resolve.ts";
import type { ThemeSource } from "./types.ts";

const source = (overrides: ThemeSource["overrides"]): ThemeSource => ({
  base: "light",
  keys: {},
  overrides,
});

describe("contrast in a resolved theme (theme-creator R3.3, R3.6, design §6)", () => {
  it("finds no failures in the built-in themes", () => {
    for (const base of ["light", "dark"] as const) {
      expect(
        failingPairings(resolveTheme({ ...source({ semantic: {}, component: {} }), base })),
      ).toEqual([]);
    }
  });

  it("lists a failing pairing with its tokens, ratio and minimum", () => {
    const theme = resolveTheme(
      source({
        semantic: { "color.text.subtle": { kind: "color", hex: "#c5d3e0" } },
        component: {},
      }),
    );

    const failures = failingPairings(theme);

    expect(failures.map(({ token, against, min }) => `${token} on ${against} (${min})`)).toEqual([
      "color.text.subtle on color.surface.base (text)",
      "color.text.subtle on color.surface.raised (text)",
      "color.text.subtle on color.surface.sunken (text)",
      "color.text.subtle on color.surface.code (text)",
      // Components whose text aliases it fail with it.
      ...failures.slice(4).map(({ token, against, min }) => `${token} on ${against} (${min})`),
    ]);
    expect(failures.slice(4).length).toBeGreaterThan(0);
    expect(failures.every(({ ratio }) => ratio < 4.5)).toBe(true);
    expect(failures[0]?.ratio).toBeCloseTo(
      contrastRatio(hexToSrgb("#c5d3e0"), hexToSrgb("#fbf8f2")),
      2,
    );
  });

  it("measures a re-pointed component token against its new semantic", () => {
    const repointed = resolveTheme(
      source({
        semantic: {},
        component: { "component.button.primary.text": "color.action.background" },
      }),
    );

    const failure = failingPairings(repointed).find(
      ({ token }) => token === "component.button.primary.text",
    );
    expect(failure?.ratio).toBeCloseTo(1, 5);
  });

  it("composites glass over its backdrops, reporting the worst one", () => {
    const theme = resolveTheme(
      source({
        semantic: { "color.surface.glass": { kind: "color", hex: "#185480" } },
        component: {},
      }),
    );

    const glass = themePairings(theme).find(
      ({ token, against }) => token === "color.text.default" && against === "color.surface.glass",
    );
    expect(glass?.backdrop).toBeDefined();
  });
});
