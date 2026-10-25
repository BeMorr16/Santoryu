import { parseHex } from "../../../components/ColorField/ColorField.tsx";
import { isThemeName } from "../../../theme/custom-themes.ts";
import { primitiveTokens } from "../../../tokens/primitives.ts";
import type { DtcgValue, PrimitiveTokenMeta } from "../../../tokens/types.ts";
import { siteUrl } from "../../../site.config.ts";
import { componentTokens, semanticTokens } from "../../../tokens/metadata.ts";
import { builtInThemes } from "../../../theme/apply-theme.ts";
import { componentByName, semanticByName } from "./builtin.ts";
import {
  componentOptions,
  inRange,
  inputProblem,
  keyRanges,
  sectionOf,
  semanticControl,
  type ValueRange,
} from "./controls.ts";
import { defaultKeys } from "./derive.ts";
import { hexToSrgb, srgbToHex, srgbToOklch } from "./oklch.ts";
import { overrideValue, resolveTheme } from "./resolve.ts";
import { parseDimension } from "./values.ts";
import {
  fontIds,
  keyIds,
  type BuiltInTheme,
  type FontId,
  type KeyValues,
  type ResolvedTheme,
  type ResolvedValue,
  type ThemeSource,
  type TokenValueInput,
} from "./types.ts";

/**
 * DTCG 2025.10 export and import (theme-creator R10; design §9). The file holds every semantic
 * token (a primitive's exact `$value` where it still equals one), every component token as a
 * reference inside the file, and the theme's name, scheme, base and keys as extensions.
 */

export const DTCG_MEDIA_TYPE = "application/design-tokens+json";
export const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_LISTED_ERRORS = 10;

/** A JSON object: the export file and its groups. */
type JsonObject = Record<string, unknown>;

const primitiveByName = new Map(primitiveTokens.map((primitive) => [primitive.name, primitive]));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The primitive a resolved value still equals: its ref's, or any of the same type and value. */
function primitiveFor(type: string, value: ResolvedValue): PrimitiveTokenMeta | undefined {
  const byRef = value.ref === undefined ? undefined : primitiveByName.get(value.ref);
  if (byRef?.css === value.css) return byRef;
  return primitiveTokens.find(
    (primitive) => primitive.type === type && primitive.css === value.css,
  );
}

const round4 = (value: number) => Number(value.toFixed(4));

/** The DTCG value of an edited semantic, from its type (design §9.2). */
function ownValue(type: string, value: ResolvedValue): DtcgValue {
  if (type === "color" && value.srgb) {
    return {
      colorSpace: "srgb",
      components: value.srgb.map(round4),
      alpha: value.alpha ?? 1,
      hex: `#${value.srgb
        .map((channel) =>
          Math.round(channel * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`,
    };
  }
  const dimension = parseDimension(value.css);
  if (type === "dimension" && dimension) return { value: dimension.value, unit: dimension.unit };
  // Tracking (em) and measures (ch) are numbers in the source too (decision 0004).
  if (type === "number" || type === "fontWeight") return dimension?.value ?? Number(value.css);
  return value.css;
}

/** Sets `value` at a dotted path inside nested groups. */
function setPath(root: JsonObject, path: string, value: JsonObject) {
  const parts = path.split(".");
  let group = root;
  for (const part of parts.slice(0, -1)) {
    const next = group[part];
    if (isObject(next)) {
      group = next;
    } else {
      const created: JsonObject = {};
      group[part] = created;
      group = created;
    }
  }
  group[parts.at(-1) ?? path] = value;
}

/** The export file's name: `<name-slug>.tokens.json` (R10.1). */
export function exportFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "theme"}.tokens.json`;
}

/** A resolved theme as a DTCG file (R10.1). */
export function exportTheme(name: string, source: ThemeSource, theme: ResolvedTheme): JsonObject {
  const keys: KeyValues = { ...defaultKeys(source.base), ...source.keys };
  const file: JsonObject = {
    $description: `Theme “${name}” exported from ${new URL("/design-system/theme-creator", siteUrl).href}`,
    $extensions: {
      "personal-site.theme": {
        version: 1,
        name,
        colorScheme: theme.scheme,
        base: source.base,
        keys: { ...keys },
      },
    },
  };
  for (const token of semanticTokens) {
    const value = theme.semantic[token.name];
    if (!value) continue;
    const primitive = primitiveFor(token.type, value);
    setPath(file, token.name, {
      $type: token.type,
      $value: primitive ? primitive.dtcg : ownValue(token.type, value),
      ...(primitive && { $extensions: { "personal-site.source": primitive.name } }),
    });
  }
  for (const token of componentTokens) {
    setPath(file, token.name, {
      $type: token.type,
      $value: `{${theme.component[token.name] ?? token.aliases}}`,
    });
  }
  return file;
}

export type ImportResult =
  | { ok: true; name: string; source: ThemeSource; ignored: number }
  | { ok: false; errors: string[]; more: number };

/** Every token in a parsed file: its dotted path and its node, skipping `$` properties. */
function* walk(
  node: Record<string, unknown>,
  path: string[] = [],
): Generator<[string, Record<string, unknown>]> {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || !isObject(child)) continue;
    if ("$value" in child) yield [[...path, key].join("."), child];
    else yield* walk(child, [...path, key]);
  }
}

const fontStacks = new Map<FontId, DtcgValue | undefined>(
  fontIds.map((font) => {
    const name = { "space-grotesk": "display", inter: "sans", "fira-code": "mono" }[font];
    return [font, primitiveByName.get(`type.font-stack.${name}`)?.dtcg];
  }),
);

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A DTCG value as a typed input for a semantic token, or a problem (R10.5: never raw CSS). */
function readInput(token: string, value: unknown): TokenValueInput | string {
  const control = semanticControl(token);
  switch (control.kind) {
    case "color": {
      if (!isObject(value)) return `${token} needs a color`;
      const { hex, components } = value;
      const channels =
        Array.isArray(components) &&
        components.length === 3 &&
        components.every((channel) => typeof channel === "number" && channel >= 0 && channel <= 1)
          ? srgbToHex([components[0], components[1], components[2]])
          : null;
      const parsed = typeof hex === "string" ? parseHex(hex) : channels;
      return parsed ? { kind: "color", hex: parsed } : `${token} needs a color`;
    }
    case "font": {
      const font = fontIds.find((id) => sameJson(fontStacks.get(id), value));
      return font ? { kind: "font", font } : `${token} needs one of the three font stacks`;
    }
    case "dimension":
      if (control.unit === "ch") {
        return typeof value === "number"
          ? { kind: "dimension", value, unit: "ch" }
          : `${token} needs a number`;
      }
      return isObject(value) &&
        typeof value.value === "number" &&
        (value.unit === "rem" || value.unit === "px")
        ? { kind: "dimension", value: value.value, unit: value.unit }
        : `${token} needs a dimension`;
    case "number":
      return typeof value === "number" ? { kind: "number", value } : `${token} needs a number`;
    case "readonly":
      return `${token} can't be edited`;
  }
}

function readKeys(value: unknown, base: BuiltInTheme): KeyValues {
  const keys = defaultKeys(base);
  if (!isObject(value)) return keys;
  const hex = (key: unknown) => (typeof key === "string" ? parseHex(key) : null);
  const font = (key: unknown) => fontIds.find((id) => id === key);
  const number = (key: unknown, range: ValueRange) =>
    typeof key === "number" && inRange(key, range) ? key : undefined;
  return {
    action: hex(value.action) ?? keys.action,
    accent: hex(value.accent) ?? keys.accent,
    accent2: hex(value.accent2) ?? keys.accent2,
    background: hex(value.background) ?? keys.background,
    headingFont: font(value.headingFont) ?? keys.headingFont,
    bodyFont: font(value.bodyFont) ?? keys.bodyFont,
    typeScale: number(value.typeScale, keyRanges.typeScale) ?? keys.typeScale,
    radius: number(value.radius, keyRanges.radius) ?? keys.radius,
    borderWidth: number(value.borderWidth, keyRanges.borderWidth) ?? keys.borderWidth,
    density: number(value.density, keyRanges.density) ?? keys.density,
  };
}

/** Only the keys that differ from the base's, as a source stores them. */
function changedKeys(keys: KeyValues, base: BuiltInTheme): Partial<KeyValues> {
  const defaults = defaultKeys(base);
  const changed: Partial<KeyValues> = {};
  for (const key of keyIds) {
    if (keys[key] !== defaults[key]) Object.assign(changed, { [key]: keys[key] });
  }
  return changed;
}

/**
 * A DTCG file read back into a theme source (R10.3–R10.5; design §9.3): every path known, every
 * value typed and in range. On any error nothing is returned but the first 10 errors and a count.
 * Non-editable semantics are ignored and counted.
 */
export function importTheme(text: string, fallbackName: string): ImportResult {
  const fail = (errors: string[]): ImportResult => ({
    ok: false,
    errors: errors.slice(0, MAX_LISTED_ERRORS),
    more: Math.max(0, errors.length - MAX_LISTED_ERRORS),
  });
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    return fail(["The file is larger than 1 MB."]);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail(["The file isn't valid JSON."]);
  }
  if (!isObject(data)) return fail(["The file isn't a design tokens file."]);

  const extension = isObject(data.$extensions)
    ? data.$extensions["personal-site.theme"]
    : undefined;
  const meta = isObject(extension) ? extension : {};
  const surface =
    isObject(data.color) && isObject(data.color.surface) ? data.color.surface.base : undefined;
  const surfaceHex = isObject(surface)
    ? readInput("color.surface.base", surface.$value)
    : undefined;
  const base: BuiltInTheme =
    builtInThemes.find((theme) => theme === meta.base) ??
    builtInThemes.find((theme) => theme === meta.colorScheme) ??
    (typeof surfaceHex === "object" &&
    surfaceHex.kind === "color" &&
    srgbToOklch(hexToSrgb(surfaceHex.hex)).l < 0.6
      ? "dark"
      : "light");
  const keys = readKeys(meta.keys, base);
  const derived = resolveTheme({ base, keys, overrides: { semantic: {}, component: {} } });

  const errors: string[] = [];
  const semantic: Record<string, TokenValueInput> = {};
  const component: Record<string, string> = {};
  let ignored = 0;
  for (const [path, node] of walk(data)) {
    const value = node.$value;
    if (semanticByName.has(path)) {
      if (sectionOf(path) === null || semanticControl(path).kind === "readonly") {
        ignored++;
        continue;
      }
      const input = readInput(path, value);
      if (typeof input === "string") {
        errors.push(input);
        continue;
      }
      const problem = inputProblem(path, input);
      if (problem !== undefined) {
        errors.push(problem);
        continue;
      }
      const sourceRef = isObject(node.$extensions)
        ? node.$extensions["personal-site.source"]
        : undefined;
      const swatch = typeof sourceRef === "string" ? primitiveByName.get(sourceRef) : undefined;
      const typed =
        input.kind === "color" && swatch && swatch.css === input.hex
          ? { ...input, ref: swatch.name }
          : input;
      if (overrideValue(path, typed, base).css !== derived.semantic[path]?.css)
        semantic[path] = typed;
    } else if (componentByName.has(path)) {
      const target = typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;
      if (target === undefined || !componentOptions(path).includes(target)) {
        errors.push(`${path} can't refer to ${typeof value === "string" ? value : "that value"}`);
      } else if (target !== componentByName.get(path)?.aliases) {
        component[path] = target;
      }
    } else {
      errors.push(`${path} isn't a token in this site's system`);
    }
  }
  if (errors.length > 0) return fail(errors);
  const name =
    typeof meta.name === "string" && isThemeName(meta.name.trim())
      ? meta.name.trim()
      : fallbackName;
  return {
    ok: true,
    name,
    source: { base, keys: changedKeys(keys, base), overrides: { semantic, component } },
    ignored,
  };
}
