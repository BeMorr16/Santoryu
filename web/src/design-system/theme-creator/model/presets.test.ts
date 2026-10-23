import { describe, expect, it } from "vitest";
import { failingPairings, themePairings } from "./contrast.ts";
import { presets } from "./presets.ts";
import { resolveTheme } from "./resolve.ts";
import { themeVars } from "./vars.ts";

describe("presets (theme-creator R2.8, design §7)", () => {
  it("offers High contrast, Soft and Compact", () => {
    expect(presets.map(({ name, source }) => [name, source.base])).toEqual([
      ["High contrast", "light"],
      ["Soft", "light"],
      ["Compact", "dark"],
    ]);
  });

  it.each(presets.map((preset) => [preset.name, preset] as const))(
    "%s passes every declared pairing, and differs from its base",
    (_name, preset) => {
      const theme = resolveTheme(preset.source);

      expect(failingPairings(theme)).toEqual([]);
      expect(theme.scheme).toBe(preset.source.base);
      expect(Object.keys(themeVars(theme, "diff")).length).toBeGreaterThan(0);
    },
  );

  it("High contrast has every text pairing at 7:1 or more", () => {
    const preset = presets.find(({ id }) => id === "high-contrast");
    if (!preset) throw new Error("no High contrast preset");

    const low = themePairings(resolveTheme(preset.source)).filter(
      ({ min, ratio }) => min === "text" && ratio < 7,
    );

    expect(low).toEqual([]);
  });
});
