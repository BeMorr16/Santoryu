import { parseHex, type ColorSwatch } from "../../components/ColorField/ColorField.tsx";
import { primitiveTokens } from "../../tokens/primitives.ts";
import { builtInValueOf } from "./model/builtin.ts";
import { colorFamilies, type ColorKeyId } from "./model/families.ts";
import type { Hex } from "./model/types.ts";

/** The palette as swatches (theme-creator design §8.4): by ramp, named like "Gold 600". */

/** The ramps a color row's Family menu offers, in this order. */
export const families = [
  "gold",
  "champagne",
  "cyan",
  "violet",
  "slate",
  "neutral",
  "gray",
  "sand",
  "red",
  "green",
  "orange",
] as const;
export type Family = (typeof families)[number];

const title = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

export const familyName = (family: Family) => title(family);

/** Opaque color primitives as swatches, with their ramp and name. */
const palette = primitiveTokens.flatMap(({ name, category, group, css, alpha }) => {
  const hex = category === "color" && alpha === 1 ? parseHex(css) : null;
  const step = name.split(".")[2] ?? "";
  return hex ? [{ name, group, swatch: { value: hex, name: `${title(group)} ${step}` } }] : [];
});

const ramp = (family: Family) =>
  palette.filter(({ group }) => group === family).map(({ swatch }) => swatch);

/** Each ramp's swatches, lightest first. */
export const rampSwatches: Readonly<Record<Family, readonly ColorSwatch[]>> = {
  gold: ramp("gold"),
  champagne: ramp("champagne"),
  cyan: ramp("cyan"),
  violet: ramp("violet"),
  slate: ramp("slate"),
  neutral: ramp("neutral"),
  gray: ramp("gray"),
  sand: ramp("sand"),
  red: ramp("red"),
  green: ramp("green"),
  orange: ramp("orange"),
};

/** The ramp a primitive belongs to, if it's one of the families. */
export function familyOfRef(ref: string | undefined): Family | undefined {
  const group = ref?.split(".")[1];
  return families.find((family) => family === group);
}

/** The primitive with this hex in a ramp: a picked swatch's source (R8.2). */
export function primitiveInFamily(family: Family, hex: Hex): string | undefined {
  return palette.find(({ group, swatch }) => group === family && swatch.value === hex)?.name;
}

const hueSteps = ["gold.600", "cyan.500", "violet.600", "red.600", "green.600", "orange.600"];
const surfaceSteps = ["gray.0", "gray.50", "sand.100", "violet.50", "slate.900", "neutral.950"];

/** A key control's suggestions: its anchor in both built-in themes, then a step per hue. */
function suggestions(key: ColorKeyId): readonly ColorSwatch[] {
  const family = colorFamilies.find((candidate) => candidate.key === key);
  const anchors = family
    ? (["light", "dark"] as const).map((theme) => builtInValueOf(family.anchor, theme).ref)
    : [];
  const steps = (key === "background" ? surfaceSteps : hueSteps).map((step) => `color.${step}`);
  return [...new Set([...anchors, ...steps])].flatMap(
    (name) => palette.find((entry) => entry.name === name)?.swatch ?? [],
  );
}

export const keySwatches: Readonly<Record<ColorKeyId, readonly ColorSwatch[]>> = {
  action: suggestions("action"),
  accent: suggestions("accent"),
  accent2: suggestions("accent2"),
  background: suggestions("background"),
};
