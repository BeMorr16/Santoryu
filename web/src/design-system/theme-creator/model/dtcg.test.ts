import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../../test/seeded-random.ts";
import { primitiveTokens } from "../../../tokens/primitives.ts";
import { semanticTokens } from "../../../tokens/metadata.ts";
import {
  componentOptions,
  keyRanges,
  sectionComponents,
  sectionOf,
  sectionSemantics,
  semanticControl,
} from "./controls.ts";
import { exportFileName, exportTheme, importTheme, MAX_IMPORT_BYTES } from "./dtcg.ts";
import { presets } from "./presets.ts";
import { resolveTheme } from "./resolve.ts";
import { srgbToHex } from "./oklch.ts";
import { fontIds, type ThemeSource, type TokenValueInput } from "./types.ts";
import { themeVars } from "./vars.ts";

const empty = { semantic: {}, component: {} };
const light: ThemeSource = { base: "light", keys: {}, overrides: empty };

function exported(source: ThemeSource, name = "Ocean") {
  return exportTheme(name, source, resolveTheme(source));
}

/** Every token node in an exported file, by dotted path. */
function tokensOf(
  file: Record<string, unknown>,
  path: string[] = [],
): Map<string, Record<string, unknown>> {
  const found = new Map<string, Record<string, unknown>>();
  for (const [key, child] of Object.entries(file)) {
    if (key.startsWith("$") || typeof child !== "object" || child === null) continue;
    const node = child as Record<string, unknown>;
    if ("$value" in node) found.set([...path, key].join("."), node);
    else for (const [inner, value] of tokensOf(node, [...path, key])) found.set(inner, value);
  }
  return found;
}

const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether a $value fits its $type, per DTCG 2025.10. */
function fitsType(type: unknown, value: unknown): boolean {
  if (typeof value === "string" && /^\{[^{}]+\}$/.test(value)) return true;
  switch (type) {
    case "color":
      return (
        isRecord(value) &&
        value.colorSpace === "srgb" &&
        Array.isArray(value.components) &&
        value.components.length === 3 &&
        value.components.every(isNumber)
      );
    case "dimension":
      return (
        isRecord(value) && isNumber(value.value) && (value.unit === "px" || value.unit === "rem")
      );
    case "duration":
      return (
        isRecord(value) && isNumber(value.value) && (value.unit === "ms" || value.unit === "s")
      );
    case "number":
    case "fontWeight":
      return isNumber(value);
    case "fontFamily":
      return (
        typeof value === "string" ||
        (Array.isArray(value) && value.every((part) => typeof part === "string"))
      );
    case "cubicBezier":
      return Array.isArray(value) && value.length === 4 && value.every(isNumber);
    case "shadow":
      return isRecord(value) || Array.isArray(value);
    default:
      return false;
  }
}

function pick<T>(next: () => number, items: readonly T[]): T {
  const item = items[Math.floor(next() * items.length)];
  if (item === undefined) throw new Error("empty list");
  return item;
}

const onStep = (
  next: () => number,
  { min, max, step }: { min: number; max: number; step: number },
) => Number((min + Math.floor(next() * ((max - min) / step + 1)) * step).toFixed(4));

const randomHex = (next: () => number) => srgbToHex([next(), next(), next()]);

/** A random source within every control's limits. */
function randomSource(seed: number): ThemeSource {
  const next = seededRandom(seed);
  const keys: ThemeSource["keys"] = {};
  if (next() < 0.6) keys.action = randomHex(next);
  if (next() < 0.4) keys.accent = randomHex(next);
  if (next() < 0.4) keys.accent2 = randomHex(next);
  if (next() < 0.4) keys.background = randomHex(next);
  if (next() < 0.3) keys.headingFont = pick(next, fontIds);
  if (next() < 0.3) keys.bodyFont = pick(next, fontIds);
  for (const key of ["typeScale", "radius", "borderWidth", "density"] as const) {
    if (next() < 0.4) keys[key] = onStep(next, keyRanges[key]);
  }
  const semantic: Record<string, TokenValueInput> = {};
  const editable = Object.values(sectionSemantics)
    .flat()
    .filter(({ name }) => semanticControl(name).kind !== "readonly");
  for (let index = 0; index < Math.floor(next() * 6); index++) {
    const token = pick(next, editable).name;
    const control = semanticControl(token);
    if (control.kind === "color") semantic[token] = { kind: "color", hex: randomHex(next) };
    else if (control.kind === "font") semantic[token] = { kind: "font", font: pick(next, fontIds) };
    else if (control.kind === "dimension") {
      semantic[token] = { kind: "dimension", value: onStep(next, control), unit: control.unit };
    } else if (control.kind === "number")
      semantic[token] = { kind: "number", value: onStep(next, control) };
  }
  const component: Record<string, string> = {};
  const tokens = Object.values(sectionComponents).flat();
  for (let index = 0; index < Math.floor(next() * 4); index++) {
    const token = pick(next, tokens).name;
    component[token] = pick(next, componentOptions(token));
  }
  return { base: next() < 0.5 ? "light" : "dark", keys, overrides: { semantic, component } };
}

describe("exportTheme (theme-creator R10.1, design §9.2)", () => {
  it("names the file from the theme", () => {
    expect(exportFileName("Ocean Deep!")).toBe("ocean-deep.tokens.json");
    expect(exportFileName("Café au lait")).toBe("cafe-au-lait.tokens.json");
    expect(exportFileName("???")).toBe("theme.tokens.json");
  });

  it("gives every token a $value that fits its $type", () => {
    const file = exported(randomSource(7));
    const tokens = tokensOf(file);

    expect(tokens.size).toBeGreaterThan(400);
    for (const [path, node] of tokens) {
      expect("$value" in node, path).toBe(true);
      expect(fitsType(node.$type, node.$value), `${path}: ${JSON.stringify(node.$value)}`).toBe(
        true,
      );
    }
  });

  it("writes component tokens as references that resolve inside the file", () => {
    const tokens = tokensOf(exported(randomSource(11)));

    const references = [...tokens].filter(([path]) => path.startsWith("component."));
    expect(references.length).toBeGreaterThan(300);
    for (const [path, node] of references) {
      const target = /^\{([^{}]+)\}$/.exec(String(node.$value))?.[1];
      expect(target && tokens.has(target), `${path} → ${String(node.$value)}`).toBe(true);
    }
  });

  it("carries the name, scheme, base and every key in its extension", () => {
    const file = exported(
      { base: "light", keys: { background: "#0b2338" }, overrides: empty },
      "Night",
    );

    expect(file.$extensions).toMatchObject({
      "personal-site.theme": {
        version: 1,
        name: "Night",
        colorScheme: "dark",
        base: "light",
        keys: { background: "#0b2338", action: "#b37500", density: 0.25 },
      },
    });
    expect(file.$description).toBe(
      "Theme “Night” exported from https://ben-morrison.com/design-system/theme-creator",
    );
  });

  it("gives an unchanged semantic its primitive's exact DTCG value and source", () => {
    const tokens = tokensOf(exported(light));
    const byName = new Map(primitiveTokens.map((primitive) => [primitive.name, primitive]));

    for (const token of semanticTokens) {
      const node = tokens.get(token.name);
      const source = (node?.$extensions as Record<string, unknown> | undefined)?.[
        "personal-site.source"
      ];
      const ref = token.themed ? token.values.light.ref : token.values.all.ref;
      expect(source, token.name).toBe(ref);
      expect(node?.$value, token.name).toEqual(byName.get(ref)?.dtcg);
    }
  });
});

describe("importTheme: round trip (R10.4)", () => {
  const cases = [
    ...presets.map((preset) => [preset.name, preset.source] as const),
    ...Array.from(
      { length: 50 },
      (_, seed) => [`random ${String(seed)}`, randomSource(seed)] as const,
    ),
  ];

  it.each(cases)(
    "%s resolves to the same custom properties after export and import",
    (_name, source) => {
      const theme = resolveTheme(source);
      const result = importTheme(
        JSON.stringify(exportTheme("Round trip", source, theme)),
        "fallback",
      );

      if (!result.ok) throw new Error(result.errors.join("\n"));
      expect(result.name).toBe("Round trip");
      expect(themeVars(resolveTheme(result.source), "full")).toEqual(themeVars(theme, "full"));
      expect(resolveTheme(result.source).scheme).toBe(theme.scheme);
    },
  );

  it("keeps a picked swatch's primitive as its source", () => {
    const source: ThemeSource = {
      base: "light",
      keys: {},
      overrides: {
        semantic: {
          "color.text.default": { kind: "color", hex: "#0b0c0e", ref: "color.neutral.950" },
        },
        component: {},
      },
    };
    const result = importTheme(JSON.stringify(exported(source)), "x");

    expect(result.ok && result.source.overrides.semantic["color.text.default"]).toEqual({
      kind: "color",
      hex: "#0b0c0e",
      ref: "color.neutral.950",
    });
  });
});

describe("importTheme: validation (R10.3, R10.5)", () => {
  const valid = () => exported(light) as Record<string, Record<string, Record<string, unknown>>>;

  function errorsFor(edit: (file: ReturnType<typeof valid>) => void) {
    const file = valid();
    edit(file);
    const result = importTheme(JSON.stringify(file), "x");
    return result.ok ? [] : result.errors;
  }

  it("refuses a file over 1 MB, or that isn't JSON", () => {
    expect(importTheme(" ".repeat(MAX_IMPORT_BYTES + 1), "x")).toEqual({
      ok: false,
      errors: ["The file is larger than 1 MB."],
      more: 0,
    });
    expect(importTheme("{nope", "x")).toEqual({
      ok: false,
      errors: ["The file isn't valid JSON."],
      more: 0,
    });
    expect(importTheme("[]", "x")).toEqual({
      ok: false,
      errors: ["The file isn't a design tokens file."],
      more: 0,
    });
  });

  it("refuses an unknown token path", () => {
    expect(
      errorsFor((file) => {
        file.color = { ...file.color, nope: { tone: { $type: "color", $value: "x" } } };
      }),
    ).toEqual(["color.nope.tone isn't a token in this site's system"]);
  });

  it("refuses a value of the wrong type", () => {
    expect(
      errorsFor((file) => {
        Object.assign(file.color?.text?.default ?? {}, { $value: 12 });
      }),
    ).toEqual(["color.text.default needs a color"]);
  });

  it("refuses a value out of range, or in the wrong unit", () => {
    expect(
      errorsFor((file) => {
        Object.assign(file.space?.inset?.md ?? {}, { $value: { value: 99, unit: "rem" } });
        Object.assign(file.radius?.control ?? {}, { $value: { value: 1, unit: "rem" } });
      }),
    ).toEqual(["space.inset.md must be from 0rem to 8rem", "radius.control needs a value in px"]);
  });

  it("refuses a re-point that isn't an option", () => {
    expect(
      errorsFor((file) => {
        const button = file.component?.button as Record<string, Record<string, unknown>>;
        Object.assign(button.primary?.background ?? {}, { $value: "{color.surface.glass}" });
        Object.assign(button.gap ?? {}, { $value: "{space.stack.md}" });
      }),
    ).toEqual([
      "component.button.gap can't refer to {space.stack.md}",
      "component.button.primary.background can't refer to {color.surface.glass}",
    ]);
  });

  it("lists the first 10 errors and counts the rest", () => {
    const file = valid();
    file.unknown = Object.fromEntries(
      Array.from({ length: 13 }, (_, index) => [`t${String(index)}`, { $value: 1 }]),
    );

    const result = importTheme(JSON.stringify(file), "x");

    expect(result).toMatchObject({ ok: false, more: 3 });
    expect(result.ok ? [] : result.errors).toHaveLength(10);
  });

  it("ignores non-editable semantics, and counts them", () => {
    const result = importTheme(JSON.stringify(exported(light)), "x");
    const ignored = semanticTokens.filter(
      ({ name }) => sectionOf(name) === null || semanticControl(name).kind === "readonly",
    );

    expect(ignored.map(({ category }) => category)).toEqual(
      expect.arrayContaining(["motion", "size", "layer", "effect"]),
    );
    expect(result).toMatchObject({ ok: true, ignored: ignored.length });
  });

  it("reads a minimal file: no extension, a dark background picks the dark base", () => {
    const result = importTheme(
      JSON.stringify({
        color: {
          surface: {
            base: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0.1] } },
          },
        },
      }),
      "From file",
    );

    expect(result).toMatchObject({ ok: true, name: "From file", source: { base: "dark" } });
  });

  it("never lets an imported string reach the CSS (R10.5)", () => {
    const hostile = valid();
    Object.assign(hostile.type?.family?.body ?? {}, { $value: "x; } body { color: red" });
    Object.assign(hostile.color?.text?.default ?? {}, {
      $value: { colorSpace: "srgb", hex: "url(x)" },
    });
    expect(importTheme(JSON.stringify(hostile), "x")).toMatchObject({
      ok: false,
      errors: [
        "color.text.default needs a color",
        "type.family.body needs one of the three font stacks",
      ],
    });

    const sneaky = valid();
    Object.assign(sneaky.color?.text?.muted ?? {}, {
      $value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], hex: "#123456;}" },
    });
    const result = importTheme(JSON.stringify(sneaky), "x");
    if (result.ok) {
      for (const value of Object.values(themeVars(resolveTheme(result.source), "full"))) {
        expect(value).not.toMatch(/[;{}]|url\(/);
      }
    } else {
      expect(result.errors).toEqual(["color.text.muted needs a color"]);
    }
  });
});
