import type { ThemeSource } from "./types.ts";

/**
 * Starting points (theme-creator R2.8, design §7): fixed key values and overrides. They aren't
 * switcher options. Values are tuned in visual review; tests keep every pairing passing.
 */
export interface Preset {
  id: "high-contrast" | "soft" | "compact";
  name: string;
  source: ThemeSource;
}

const color = (hex: `#${string}`) => ({ kind: "color", hex }) as const;

export const presets: readonly Preset[] = [
  {
    id: "high-contrast",
    name: "High contrast",
    source: {
      base: "dark",
      keys: { background: "#0b1220", action: "#f5e3c2", borderWidth: 2 },
      overrides: {
        // Text pairings at 7:1 or more (AAA), including glass over every backdrop it declares.
        semantic: {
          "color.text.default": color("#ffffff"),
          "color.text.muted": color("#e6ecf3"),
          "color.text.subtle": color("#d3dce6"),
          "color.surface.glass": color("#000000"),
          "color.accent-2.fill-text": color("#ffffff"),
          "color.border.default": color("#63676f"),
        },
        component: {},
      },
    },
  },
  {
    id: "soft",
    name: "Soft",
    source: {
      base: "light",
      keys: { action: "#5b3fa6", radius: 12, density: 0.3, headingFont: "inter" },
      overrides: { semantic: {}, component: {} },
    },
  },
  {
    id: "compact",
    name: "Compact",
    source: {
      base: "dark",
      keys: { radius: 0, density: 0.2, bodyFont: "space-grotesk" },
      overrides: { semantic: {}, component: {} },
    },
  },
];
