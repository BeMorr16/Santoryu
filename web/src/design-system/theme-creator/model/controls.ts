import type { ComponentTokenMeta, SemanticTokenMeta } from "../../../tokens/types.ts";
import { componentTokens, semanticTokens } from "../../../tokens/metadata.ts";
import { builtInValue, componentByName, semanticByName } from "./builtin.ts";
import type { KeyId, TokenValueInput } from "./types.ts";

/** The editor's sections (R4.1) and the controls each token gets (R6.1; design §8.4). */

export const sections = [
  { id: "color", title: "Color" },
  { id: "typography", title: "Typography" },
  { id: "shape", title: "Shape" },
  { id: "spacing", title: "Spacing" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export interface ValueRange {
  min: number;
  max: number;
  step: number;
}

export type SemanticControl =
  | { kind: "color" }
  | { kind: "font" }
  | ({ kind: "dimension"; unit: "rem" | "px" | "ch" } & ValueRange)
  /** Unitless, or em for tracking. */
  | ({ kind: "number"; unit?: "em" } & ValueRange)
  | { kind: "readonly" };

/** The section a semantic token is edited in, or null for motion, size, layer and the rest. */
export function sectionOf(token: string): SectionId | null {
  const [category] = token.split(".");
  if (category === "color") return "color";
  if (category === "type") return "typography";
  if (category === "space") return "spacing";
  if (category === "radius" || token === "effect.border.width") return "shape";
  return null;
}

const isTranslucent = (token: SemanticTokenMeta) =>
  (builtInValue(token, "light").alpha ?? 1) < 1 || (builtInValue(token, "dark").alpha ?? 1) < 1;

/** The control for a semantic token, by its path (the table in design §8.4). */
export function semanticControl(token: string): SemanticControl {
  // No fill is transparent in every theme: there's nothing to pick.
  if (token === "color.fill.none" || token === "radius.pill") return { kind: "readonly" };
  const [category, group] = token.split(".");
  if (category === "color") return { kind: "color" };
  if (category === "space") return { kind: "dimension", unit: "rem", min: 0, max: 8, step: 0.0625 };
  if (category === "radius") return { kind: "dimension", unit: "px", min: 0, max: 48, step: 1 };
  if (token === "effect.border.width") {
    return { kind: "dimension", unit: "px", min: 0.5, max: 4, step: 0.5 };
  }
  switch (group) {
    case "size":
      return { kind: "dimension", unit: "rem", min: 0.625, max: 6, step: 0.0625 };
    case "family":
      return { kind: "font" };
    case "weight":
      return { kind: "number", min: 100, max: 900, step: 100 };
    case "leading":
      return { kind: "number", min: 1, max: 2.5, step: 0.05 };
    case "tracking":
      return { kind: "number", unit: "em", min: -0.1, max: 0.3, step: 0.01 };
    case "measure":
      return { kind: "dimension", unit: "ch", min: 40, max: 90, step: 1 };
    default:
      return { kind: "readonly" };
  }
}

/** Every semantic token a section lists, in metadata order. */
export const sectionSemantics: Readonly<Record<SectionId, readonly SemanticTokenMeta[]>> = {
  color: semanticTokens.filter(({ name }) => sectionOf(name) === "color"),
  typography: semanticTokens.filter(({ name }) => sectionOf(name) === "typography"),
  shape: semanticTokens.filter(({ name }) => sectionOf(name) === "shape"),
  spacing: semanticTokens.filter(({ name }) => sectionOf(name) === "spacing"),
};

/** Every component token aliasing a semantic in the section, in metadata order (R6.2). */
export const sectionComponents: Readonly<Record<SectionId, readonly ComponentTokenMeta[]>> = {
  color: componentTokens.filter(({ aliases }) => sectionOf(aliases) === "color"),
  typography: componentTokens.filter(({ aliases }) => sectionOf(aliases) === "typography"),
  shape: componentTokens.filter(({ aliases }) => sectionOf(aliases) === "shape"),
  spacing: componentTokens.filter(({ aliases }) => sectionOf(aliases) === "spacing"),
};

/** `category.group`, e.g. `space.inset`; a two-part name such as `radius.control` is its category's. */
const groupOf = (token: string) => {
  const parts = token.split(".");
  return parts.slice(0, parts.length > 2 ? 2 : 1).join(".");
};

/**
 * The semantics a component token can be re-pointed to (R6.2): for a color, any opaque color
 * semantic, since text on a translucent color has no defined contrast; otherwise the editable
 * semantics in its alias's `category.group`. Its own alias is always one.
 */
export function componentOptions(token: string): readonly string[] {
  const meta = componentByName.get(token);
  if (!meta) return [];
  const section = sectionOf(meta.aliases);
  if (section === null) return [meta.aliases];
  return sectionSemantics[section]
    .filter((semantic) =>
      section === "color"
        ? semantic.name === meta.aliases || !isTranslucent(semantic)
        : semantic.name === meta.aliases ||
          (groupOf(semantic.name) === groupOf(meta.aliases) &&
            semanticControl(semantic.name).kind !== "readonly"),
    )
    .map(({ name }) => name);
}

/** The key controls' ranges (design §3.1). */
export const keyRanges: Readonly<
  Record<Extract<KeyId, "typeScale" | "radius" | "borderWidth" | "density">, ValueRange>
> = {
  typeScale: { min: 0.75, max: 1.5, step: 0.05 },
  radius: { min: 0, max: 24, step: 1 },
  borderWidth: { min: 1, max: 4, step: 1 },
  density: { min: 0.1875, max: 0.3125, step: 0.0125 },
};

/** Whether a number is inside a range's limits. The step is the controls' granularity only. */
export const inRange = (value: number, { min, max }: ValueRange) =>
  Number.isFinite(value) && value >= min && value <= max;

/**
 * Why a value can't be set on a semantic token, or undefined when it can (R10.3): the control's
 * kind, unit and range. Used for imports; the editor's own controls stay inside them.
 */
export function inputProblem(token: string, input: TokenValueInput): string | undefined {
  if (!semanticByName.has(token)) return `${token} isn't a semantic token`;
  const control = semanticControl(token);
  if (control.kind === "readonly") return `${token} can't be edited`;
  if (control.kind !== input.kind) return `${token} needs a ${control.kind} value`;
  if (input.kind === "dimension" && control.kind === "dimension" && input.unit !== control.unit) {
    return `${token} needs a value in ${control.unit}`;
  }
  if (
    (input.kind === "dimension" || input.kind === "number") &&
    (control.kind === "dimension" || control.kind === "number") &&
    !inRange(input.value, control)
  ) {
    const unit = control.unit ?? "";
    return `${token} must be from ${String(control.min)}${unit} to ${String(control.max)}${unit}`;
  }
  return undefined;
}
