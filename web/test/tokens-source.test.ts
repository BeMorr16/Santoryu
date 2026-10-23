import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokensDir = new URL("../tokens/", import.meta.url);

const categories = [
  "color",
  "type",
  "space",
  "size",
  "radius",
  "motion",
  "effect",
  "layer",
] as const;
type Category = (typeof categories)[number];

// Second path segment of every token: site-foundation design §4.3, component-library design §4.1,
// component-library-refinement design §3.3 and §13.3, palette-expansion design §5.
const layers: Record<Category, { primitive: string[]; semantic: string[] }> = {
  color: {
    primitive: [
      "gray",
      "blue",
      "gold",
      "violet",
      "red",
      "green",
      "orange",
      "cyan",
      "sand",
      "overlay",
    ],
    semantic: [
      "surface",
      "text",
      "link",
      "action",
      "accent",
      "accent-2",
      "error",
      "success",
      "warning",
      "border",
      "focus",
      "grid",
      "fill",
    ],
  },
  type: {
    primitive: [
      "font-stack",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "line-length",
    ],
    semantic: ["family", "size", "weight", "leading", "tracking", "measure"],
  },
  space: {
    primitive: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"],
    semantic: ["inset", "stack", "inline", "layout"],
  },
  size: {
    primitive: ["4", "5", "6", "8", "10", "48", "64", "80", "120", "192", "320", "viewport-height"],
    semantic: ["control", "icon", "column", "pattern", "breakpoint", "viewport"],
  },
  radius: {
    primitive: ["0", "2", "4", "8", "16", "full"],
    semantic: ["control", "surface", "pill"],
  },
  motion: { primitive: ["time", "curve"], semantic: ["duration", "easing"] },
  effect: {
    primitive: ["shadow", "line", "blur-radius"],
    semantic: ["elevation", "focus-ring", "backdrop", "border", "underline"],
  },
  layer: { primitive: ["1", "2", "3"], semantic: ["raised", "sticky", "overlay"] },
};

// Every semantic token, per site-foundation design §4.3, component-library design §4.1,
// component-library-refinement design §3.3, §9.3, §13.3, §15.6 and §16.5, palette-expansion design §3,
// and ds-components design §10.
// Adding or renaming one is a one-way door.
const expectedSemantic = [
  "color.surface.base",
  "color.surface.raised",
  "color.surface.sunken",
  "color.surface.glass",
  "color.surface.inverse",
  "color.surface.code",
  "color.text.default",
  "color.text.muted",
  "color.text.subtle",
  "color.text.inverse",
  "color.link.default",
  "color.link.hover",
  "color.link.visited",
  "color.action.background",
  "color.action.background-hover",
  "color.action.text",
  "color.accent.text",
  "color.accent.background",
  "color.accent.border",
  "color.accent-2.text",
  "color.accent-2.background",
  "color.accent-2.border",
  "color.accent-2.fill",
  "color.accent-2.fill-hover",
  "color.accent-2.fill-text",
  "color.error.text",
  "color.error.background",
  "color.error.border",
  "color.success.text",
  "color.success.background",
  "color.success.border",
  "color.warning.text",
  "color.warning.background",
  "color.warning.border",
  "color.border.subtle",
  "color.border.default",
  "color.border.strong",
  "color.focus.ring",
  "color.grid.line",
  "color.fill.none",
  "color.fill.scrim",
  "type.family.body",
  "type.family.heading",
  "type.family.code",
  "type.family.label",
  "type.size.small",
  "type.size.body",
  "type.size.lead",
  "type.size.display",
  "type.size.h1",
  "type.size.h2",
  "type.size.h3",
  "type.size.h4",
  "type.size.h5",
  "type.size.h6",
  "type.size.label",
  "type.weight.body",
  "type.weight.strong",
  "type.weight.heading",
  "type.leading.body",
  "type.leading.heading",
  "type.tracking.display",
  "type.tracking.body",
  "type.tracking.label",
  "type.measure.text",
  "space.inset.sm",
  "space.inset.md",
  "space.inset.lg",
  "space.stack.xs",
  "space.stack.sm",
  "space.stack.md",
  "space.stack.lg",
  "space.stack.xl",
  "space.inline.xs",
  "space.inline.sm",
  "space.inline.md",
  "space.inline.lg",
  "space.inline.xl",
  "space.layout.xs",
  "space.layout.sm",
  "space.layout.md",
  "space.layout.lg",
  "size.control.sm",
  "size.control.md",
  "size.icon.sm",
  "size.icon.md",
  "size.icon.lg",
  "size.column.sm",
  "size.column.md",
  "size.column.lg",
  "size.pattern.cell",
  "size.breakpoint.sm",
  "size.breakpoint.md",
  "size.breakpoint.lg",
  "size.viewport.image",
  "radius.control",
  "radius.surface",
  "radius.pill",
  "motion.duration.instant",
  "motion.duration.fast",
  "motion.duration.base",
  "motion.duration.slow",
  "motion.easing.enter",
  "motion.easing.exit",
  "motion.easing.standard",
  "effect.elevation.none",
  "effect.elevation.raised",
  "effect.elevation.overlay",
  "effect.focus-ring.width",
  "effect.focus-ring.offset",
  "effect.backdrop.glass",
  "effect.border.width",
  "effect.border.width-thick",
  "effect.underline.thickness",
  "effect.underline.thickness-hover",
  "effect.underline.offset",
  "layer.raised",
  "layer.sticky",
  "layer.overlay",
];

// Translucent primitives and the only semantic tokens allowed to alias them (decision 0004 amendment).
const overlayAliases = [
  "color.surface.glass",
  "color.grid.line",
  "color.fill.none",
  "color.fill.scrim",
];

interface SourceToken {
  path: string;
  file: string;
  value: unknown;
  type: string | undefined;
  description: unknown;
  extensions: Record<string, unknown> | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flatten(
  node: Record<string, unknown>,
  file: string,
  path: string[] = [],
  inheritedType?: string,
): SourceToken[] {
  const type = typeof node.$type === "string" ? node.$type : inheritedType;
  if ("$value" in node) {
    return [
      {
        path: path.join("."),
        file,
        value: node.$value,
        type,
        description: node.$description,
        extensions: isRecord(node.$extensions) ? node.$extensions : undefined,
      },
    ];
  }
  return Object.entries(node)
    .filter(([key]) => !key.startsWith("$"))
    .flatMap(([key, child]) => (isRecord(child) ? flatten(child, file, [...path, key], type) : []));
}

function load(file: string): SourceToken[] {
  const json: unknown = JSON.parse(readFileSync(new URL(file, tokensDir), "utf8"));
  if (!isRecord(json)) throw new Error(`${file} is not a JSON object`);
  return flatten(json, file);
}

const aliasPattern = /^\{([^{}]+)\}$/;

function aliasTarget(value: unknown): string | undefined {
  return typeof value === "string" ? aliasPattern.exec(value)?.[1] : undefined;
}

function containsAlias(value: unknown): boolean {
  if (typeof value === "string") return value.includes("{");
  if (Array.isArray(value)) return value.some(containsAlias);
  if (isRecord(value)) return Object.values(value).some(containsAlias);
  return false;
}

const categoryTokens = categories.flatMap((category) => load(`${category}.json`));
const light = load("themes/light.json");
const dark = load("themes/dark.json");
const reducedMotion = load("themes/reduced-motion.json");
const allTokens = [...categoryTokens, ...light, ...dark, ...reducedMotion];

const componentFiles = existsSync(new URL("components/", tokensDir))
  ? readdirSync(new URL("components/", tokensDir)).filter((file) => file.endsWith(".json"))
  : [];
const componentTokens = componentFiles.flatMap((file) => load(`components/${file}`));

const primitives = new Map(
  categoryTokens.filter((token) => !containsAlias(token.value)).map((t) => [t.path, t]),
);

function segments(path: string): { category: Category; group: string } {
  const [category, group] = path.split(".");
  if (!categories.includes(category as Category) || group === undefined) {
    throw new Error(`${path}: not in a known category`);
  }
  return { category: category as Category, group };
}

function keySet(tokens: SourceToken[]): string[] {
  return tokens.map((token) => token.path).sort();
}

describe("token source files", () => {
  it.each(allTokens.map((token) => [`${token.file}: ${token.path}`, token] as const))(
    "%s is a literal primitive or a single alias to a primitive",
    (_label, token) => {
      const { category, group } = segments(token.path);
      const target = aliasTarget(token.value);

      if (layers[category].primitive.includes(group)) {
        expect(containsAlias(token.value), "primitives must have literal values").toBe(false);
      } else {
        expect(layers[category].semantic, "group must be one of design §4.3").toContain(group);
        expect(target, "semantic tokens must be exactly one alias").toBeDefined();
        const primitive = primitives.get(target ?? "");
        expect(primitive, `alias {${target ?? ""}} must point to a primitive`).toBeDefined();
        expect(primitive?.type, "alias target must have the same $type").toBe(token.type);
      }
    },
  );

  it("uses disjoint primitive and semantic group names in each category", () => {
    for (const category of categories) {
      const { primitive, semantic } = layers[category];
      expect(primitive.filter((group) => semantic.includes(group))).toEqual([]);
    }
  });

  it("defines exactly the semantic tokens in design §4.3", () => {
    const semanticPaths = new Set(
      allTokens.filter((token) => containsAlias(token.value)).map((token) => token.path),
    );
    expect([...semanticPaths].sort()).toEqual([...expectedSemantic].sort());
  });

  it("aliases color.overlay.* primitives only from glass, grid lines, the empty fill and the scrim", () => {
    const aliasing = allTokens.filter((t) => aliasTarget(t.value)?.startsWith("color.overlay."));
    expect(aliasing.length).toBeGreaterThan(0);
    for (const token of aliasing) {
      expect(overlayAliases, `${token.file}: ${token.path}`).toContain(token.path);
    }
  });

  it("keeps every non-overlay color primitive opaque", () => {
    const translucent = [...primitives.values()].filter(
      (t) =>
        t.type === "color" &&
        !t.path.startsWith("color.overlay.") &&
        (t.value as { alpha?: number }).alpha !== 1,
    );
    expect(translucent.map((t) => t.path)).toEqual([]);
  });

  it("defines each semantic token in exactly one place outside the override files", () => {
    const themed = new Set(keySet(light));
    const unthemed = categoryTokens.filter((token) => containsAlias(token.value));
    expect(unthemed.filter((token) => themed.has(token.path)).map((t) => t.path)).toEqual([]);
    const counts = new Map<string, number>();
    for (const token of [...unthemed, ...light]) {
      counts.set(token.path, (counts.get(token.path) ?? 0) + 1);
    }
    expect([...counts].filter(([, count]) => count > 1)).toEqual([]);
  });

  it.each([
    ["light", light],
    ["dark", dark],
    ["reduced-motion", reducedMotion],
  ] as const)("theme file %s contains only semantic aliases", (_name, tokens) => {
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const { category, group } = segments(token.path);
      expect(layers[category].semantic, token.path).toContain(group);
      expect(aliasTarget(token.value), token.path).toBeDefined();
    }
  });

  it("gives light.json and dark.json identical key sets", () => {
    expect(keySet(dark)).toEqual(keySet(light));
  });

  it("declares the same contrast pairings in light.json and dark.json", () => {
    const pairings = (tokens: SourceToken[]) =>
      Object.fromEntries(tokens.map((t) => [t.path, t.extensions?.["personal-site.contrast"]]));
    expect(pairings(dark)).toEqual(pairings(light));
  });

  it("overrides every motion.duration token in reduced-motion.json, and nothing else", () => {
    const durations = keySet(
      [...categoryTokens, ...light].filter((t) => t.path.startsWith("motion.duration.")),
    );
    expect(durations.length).toBeGreaterThan(0);
    expect(keySet(reducedMotion)).toEqual(durations);
  });

  it.each(allTokens.map((token) => [`${token.file}: ${token.path}`, token] as const))(
    "%s has a $type and a $description",
    (_label, token) => {
      expect(token.type).toEqual(expect.any(String));
      expect(token.description).toEqual(expect.stringMatching(/\S/));
    },
  );

  it.each([...primitives.values()].filter((t) => t.type === "color").map((t) => [t.path, t]))(
    "%s is sRGB with a hex that matches its components",
    (_path, token) => {
      const value = token.value as { colorSpace: string; components: number[]; hex: string };
      expect(value.colorSpace).toBe("srgb");
      const hex = value.components
        .map((c) =>
          Math.round(c * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
      expect(value.hex).toBe(`#${hex}`);
    },
  );
});

describe("status colors (palette-expansion R2.4, R2.5)", () => {
  function hue(token: SourceToken): number {
    const [r = 0, g = 0, b = 0] = (token.value as { components: number[] }).components;
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    if (delta === 0) return 0;
    const sector =
      max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    return sector * 60;
  }
  const group = (name: string) =>
    [...primitives.values()].filter((t) => t.path.startsWith(`color.${name}.`));

  it("keeps every color.orange.* primitive at least 10° of hue from every color.gold.* primitive", () => {
    const orange = group("orange");
    const gold = group("gold");
    expect(orange.length).toBeGreaterThan(0);
    expect(gold.length).toBeGreaterThan(0);
    for (const warning of orange) {
      for (const accent of gold) {
        const gap = Math.abs(hue(warning) - hue(accent));
        expect(
          Math.min(gap, 360 - gap),
          `${warning.path} vs ${accent.path}`,
        ).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it.each(
    [...light, ...dark]
      .filter((t) => /^color\.(error|success|warning)\./.test(t.path))
      .map((t) => [`${t.file}: ${t.path}`, t] as const),
  )("%s says color is never the only cue (R2.5)", (_label, token) => {
    expect(token.description).toEqual(
      expect.stringMatching(
        /Never the only cue: the wording or an icon \(with a text alternative\) must convey the status on its own \(WCAG 1\.4\.1\)\.$/,
      ),
    );
  });
});

describe("contrast pairing coverage (design §4.5)", () => {
  const minimums = ["text", "large-text", "non-text"];
  const mustPair = (path: string) =>
    /^color\.(text|link|focus)\./.test(path) ||
    /^color\.(error|success|warning)\.(text|border)$/.test(path) ||
    [
      "color.border.strong",
      "color.action.text",
      "color.accent.text",
      "color.accent-2.text",
      "color.accent-2.fill-text",
      "color.accent-2.border",
      "color.accent-2.fill",
    ].includes(path);
  // Fills that foregrounds sit on directly, besides surfaces.
  const fills = [
    "color.action.background",
    "color.action.background-hover",
    "color.accent.background",
    "color.accent-2.background",
    "color.accent-2.fill",
    "color.accent-2.fill-hover",
    "color.error.background",
    "color.success.background",
    "color.warning.background",
  ];

  function pairingsOf(token: SourceToken): { against: string; min: string }[] {
    const raw = token.extensions?.["personal-site.contrast"];
    return Array.isArray(raw) ? (raw as { against: string; min: string }[]) : [];
  }

  it.each(
    [...light, ...dark].filter((t) => mustPair(t.path)).map((t) => [`${t.file}: ${t.path}`, t]),
  )("%s declares at least one pairing", (_label, token) => {
    expect(pairingsOf(token).length).toBeGreaterThan(0);
  });

  it("covers every surface and fill, with valid minimums and known backgrounds", () => {
    const surfaces = light.filter((t) => t.path.startsWith("color.surface.")).map((t) => t.path);
    const declared = light.flatMap((token) => pairingsOf(token));
    expect(surfaces.length).toBeGreaterThan(0);
    for (const background of [...surfaces, ...fills]) {
      expect(declared.map((p) => p.against)).toContain(background);
    }
    for (const pairing of declared) {
      expect([...surfaces, ...fills]).toContain(pairing.against);
      expect(minimums).toContain(pairing.min);
    }
  });

  function backdropOf(token: SourceToken | undefined): unknown {
    return token?.extensions?.["personal-site.contrast-backdrop"];
  }

  it("pairs only opaque foregrounds, on opaque backgrounds or translucent ones with an opaque backdrop set", () => {
    for (const theme of [light, dark]) {
      const byPath = new Map(theme.map((t) => [t.path, t]));
      const alphaOf = (path: string) => {
        const target = aliasTarget(byPath.get(path)?.value) ?? "";
        return (primitives.get(target)?.value as { alpha?: number } | undefined)?.alpha;
      };
      for (const token of theme) {
        const pairings = pairingsOf(token);
        if (pairings.length === 0) continue;
        expect(alphaOf(token.path), token.path).toBe(1);
        for (const { against } of pairings) {
          if (alphaOf(against) === 1) continue;
          const backdrop = backdropOf(byPath.get(against));
          expect(Array.isArray(backdrop), `${against} is translucent with no backdrop set`).toBe(
            true,
          );
          for (const under of backdrop as string[]) {
            expect(alphaOf(under), `${against} backdrop ${under}`).toBe(1);
          }
        }
      }
    }
  });

  it("declares the same glass backdrop set in light.json and dark.json", () => {
    const glass = (tokens: SourceToken[]) =>
      backdropOf(tokens.find((t) => t.path === "color.surface.glass"));
    expect(glass(light)).toEqual(expect.arrayContaining(["color.action.background"]));
    expect(glass(dark)).toEqual(glass(light));
  });
});

describe("component tier (decision 0004 amendment)", () => {
  const semanticPaths = new Set(
    [...categoryTokens, ...light].filter((t) => containsAlias(t.value)).map((t) => t.path),
  );
  const componentsDir = new URL("../src/components/", import.meta.url);
  const pascal = (kebab: string) =>
    kebab
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

  it.each(componentTokens.map((t) => [`${t.file}: ${t.path}`, t] as const))(
    "%s is exactly one alias to a semantic token, with a $type and $description",
    (_label, token) => {
      const target = aliasTarget(token.value);
      expect(target, "component tokens must be exactly one alias").toBeDefined();
      expect(primitives.has(target ?? ""), `{${target ?? ""}} is a primitive`).toBe(false);
      expect(target?.startsWith("component."), `{${target ?? ""}} is a component token`).toBe(
        false,
      );
      expect(semanticPaths.has(target ?? ""), `{${target ?? ""}} is not a semantic token`).toBe(
        true,
      );
      expect(token.type).toEqual(expect.any(String));
      expect(token.description).toEqual(expect.stringMatching(/\S/));
    },
  );

  it.each(componentFiles)("%s holds only component.<its name>.* tokens", (file) => {
    const kebab = file.replace(/\.json$/, "");
    for (const token of load(`components/${file}`)) {
      expect(token.path.startsWith(`component.${kebab}.`), token.path).toBe(true);
    }
  });

  it.each(componentFiles)("%s has a matching src/components/<PascalCase>/ directory", (file) => {
    const directory = pascal(file.replace(/\.json$/, ""));
    expect(existsSync(new URL(`${directory}/`, componentsDir)), directory).toBe(true);
  });

  it("puts no component tokens in the theme files", () => {
    const themed = [...light, ...dark, ...reducedMotion].filter((t) =>
      t.path.startsWith("component."),
    );
    expect(themed.map((t) => `${t.file}: ${t.path}`)).toEqual([]);
  });

  it("puts no component tokens in the category files", () => {
    expect(
      categoryTokens.filter((t) => t.path.startsWith("component.")).map((t) => t.path),
    ).toEqual([]);
  });
});
