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
      base: "light",
      keys: {
        background: "#ffffff",
        action: "#6b4a0c",
        accent: "#00495f",
        accent2: "#3d2875",
        borderWidth: 3,
      },
      overrides: {
        // Text pairings at 7:1 or more (AAA), including glass over every backdrop it declares.
        semantic: {
          "color.surface.sunken": color("#f4f5f7"),
          "color.surface.code": color("#f4f5f7"),
          "color.text.default": color("#000000"),
          "color.text.muted": color("#2c3744"),
          "color.text.subtle": color("#3a4654"),
          "color.link.default": color("#5c400a"),
          "color.link.hover": color("#4a3308"),
          "color.link.visited": color("#3d2875"),
          "color.action.background-hover": color("#5c400a"),
          "color.accent.text": color("#003c4f"),
          "color.accent-2.text": color("#33215f"),
          "color.accent-2.fill-hover": color("#c9c2ef"),
          "color.error.text": color("#8f1d17"),
          "color.success.text": color("#155234"),
          "color.warning.text": color("#6e3207"),
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
