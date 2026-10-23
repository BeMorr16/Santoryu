import { semanticTokens } from "../../../tokens/metadata.ts";
import type { KeyId } from "./types.ts";

/**
 * How a member follows its key color (design §5.3): `key` is the color itself; `shade` keeps its
 * lightness step from the anchor; `tint` keeps its own lightness; `text` keeps its lightness at
 * the key's chroma; `neutral` follows the background, mirrored when the scheme flips; `on` is
 * text on a fill, chosen from candidates.
 */
export type Role = "key" | "shade" | "tint" | "text" | "neutral" | "on";

export interface FamilyMember {
  token: string;
  role: Role;
  /** Nudged in lightness until its pairings pass. Always true for `text`. */
  nudge: boolean;
}

export type ColorKeyId = Extract<KeyId, "action" | "accent" | "accent2" | "background">;

export interface ColorFamily {
  key: ColorKeyId;
  /** The token the key's default comes from. */
  anchor: string;
  members: readonly FamilyMember[];
}

const member = (token: string, role: Role, nudge = role === "text"): FamilyMember => ({
  token: `color.${token}`,
  role,
  nudge,
});

/** In derivation order: Background first, since the others' text is checked against it. */
export const colorFamilies: readonly ColorFamily[] = [
  {
    key: "background",
    anchor: "color.surface.base",
    members: [
      member("surface.base", "key"),
      member("surface.raised", "neutral"),
      member("surface.sunken", "neutral"),
      member("surface.code", "neutral"),
      member("surface.inverse", "neutral"),
      member("surface.glass", "neutral"),
      member("text.default", "neutral", true),
      member("text.muted", "neutral", true),
      member("text.subtle", "neutral", true),
      member("text.inverse", "neutral", true),
      member("border.subtle", "neutral"),
      member("border.default", "neutral"),
      member("border.strong", "neutral", true),
      member("grid.line", "tint"),
    ],
  },
  {
    key: "action",
    anchor: "color.action.background",
    members: [
      member("action.background", "key"),
      member("action.background-hover", "shade"),
      member("action.text", "on"),
      member("link.default", "text"),
      member("link.hover", "text"),
    ],
  },
  {
    key: "accent",
    anchor: "color.accent.border",
    members: [
      member("accent.border", "key"),
      member("accent.text", "text"),
      member("accent.background", "tint"),
    ],
  },
  {
    key: "accent2",
    anchor: "color.accent-2.border",
    members: [
      member("accent-2.border", "key"),
      member("accent-2.text", "text"),
      member("accent-2.background", "tint"),
      member("accent-2.fill", "tint"),
      member("accent-2.fill-hover", "tint"),
      member("accent-2.fill-text", "on"),
      member("link.visited", "text"),
    ],
  },
];

/** The type sizes above 1rem, which the type scale stretches (design §5.4). */
export const scaledSizes = ["lead", "h1", "h2", "h3", "h4", "display"].map(
  (size) => `type.size.${size}`,
);

const spaceTokens = semanticTokens.filter((token) => token.category === "space").map((t) => t.name);

const familyTokens = (key: ColorKeyId) =>
  colorFamilies.find((family) => family.key === key)?.members.map(({ token }) => token) ?? [];

/** The semantic tokens each key control sets (design §5.2, §5.4): what the chain panel lists. */
export const keyTokens: Readonly<Record<KeyId, readonly string[]>> = {
  action: familyTokens("action"),
  accent: familyTokens("accent"),
  accent2: familyTokens("accent2"),
  background: familyTokens("background"),
  headingFont: ["type.family.heading"],
  bodyFont: ["type.family.body"],
  typeScale: scaledSizes,
  radius: ["radius.control", "radius.surface"],
  borderWidth: ["effect.border.width"],
  density: spaceTokens,
};

/** Each key control's name, as the source badges say it ("From Action"). */
export const keyLabels: Readonly<Record<KeyId, string>> = {
  action: "Action",
  accent: "Accent",
  accent2: "Second accent",
  background: "Background",
  headingFont: "Heading font",
  bodyFont: "Body font",
  typeScale: "Type scale",
  radius: "Corner radius",
  borderWidth: "Border width",
  density: "Density",
};
