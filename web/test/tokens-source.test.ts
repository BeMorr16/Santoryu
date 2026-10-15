import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokensDir = new URL("../tokens/", import.meta.url);

const categories = ["color", "type", "space", "radius", "motion", "effect"] as const;
type Category = (typeof categories)[number];

// Second path segment of every token, per design §4.3.
const layers: Record<Category, { primitive: string[]; semantic: string[] }> = {
  color: { primitive: ["gray", "blue"], semantic: ["surface", "text", "link", "border", "focus"] },
  type: {
    primitive: ["font-stack", "font-size", "font-weight", "line-height"],
    semantic: ["family", "size", "weight", "leading"],
  },
  space: {
    primitive: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"],
    semantic: ["inset", "stack", "inline", "layout"],
  },
  radius: {
    primitive: ["0", "2", "4", "8", "16", "full"],
    semantic: ["control", "surface", "pill"],
  },
  motion: { primitive: ["time", "curve"], semantic: ["duration", "easing"] },
  effect: { primitive: ["shadow", "line"], semantic: ["elevation", "focus-ring"] },
};

// Every semantic token, per design §4.3. Adding or renaming one is a one-way door.
const expectedSemantic = [
  "color.surface.base",
  "color.surface.raised",
  "color.text.default",
  "color.text.muted",
  "color.text.subtle",
  "color.link.default",
  "color.link.hover",
  "color.border.subtle",
  "color.border.strong",
  "color.focus.ring",
  "type.family.body",
  "type.family.code",
  "type.size.small",
  "type.size.body",
  "type.size.lead",
  "type.size.h1",
  "type.size.h2",
  "type.size.h3",
  "type.weight.body",
  "type.weight.strong",
  "type.weight.heading",
  "type.leading.body",
  "type.leading.heading",
  "space.inset.sm",
  "space.inset.md",
  "space.inset.lg",
  "space.stack.xs",
  "space.stack.sm",
  "space.stack.md",
  "space.stack.lg",
  "space.stack.xl",
  "space.inline.sm",
  "space.inline.md",
  "space.layout.xs",
  "space.layout.sm",
  "space.layout.md",
  "space.layout.lg",
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
  "effect.elevation.raised",
  "effect.elevation.overlay",
  "effect.focus-ring.width",
  "effect.focus-ring.offset",
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

describe("contrast pairing coverage (design §4.5)", () => {
  const minimums = ["text", "large-text", "non-text"];
  const mustPair = (path: string) =>
    /^color\.(text|link|focus)\./.test(path) || path === "color.border.strong";

  function pairingsOf(token: SourceToken): { against: string; min: string }[] {
    const raw = token.extensions?.["personal-site.contrast"];
    return Array.isArray(raw) ? (raw as { against: string; min: string }[]) : [];
  }

  it.each(
    [...light, ...dark].filter((t) => mustPair(t.path)).map((t) => [`${t.file}: ${t.path}`, t]),
  )("%s declares at least one pairing", (_label, token) => {
    expect(pairingsOf(token).length).toBeGreaterThan(0);
  });

  it("covers every surface, with valid minimums and known foregrounds", () => {
    const surfaces = light.filter((t) => t.path.startsWith("color.surface.")).map((t) => t.path);
    const declared = light.flatMap((token) => pairingsOf(token));
    expect(surfaces.length).toBeGreaterThan(0);
    for (const surface of surfaces) {
      expect(declared.map((p) => p.against)).toContain(surface);
    }
    for (const pairing of declared) {
      expect(surfaces).toContain(pairing.against);
      expect(minimums).toContain(pairing.min);
    }
  });

  it("only pairs colors that resolve to alpha 1", () => {
    for (const theme of [light, dark]) {
      const byPath = new Map(theme.map((t) => [t.path, t]));
      for (const token of theme) {
        const pairings = pairingsOf(token);
        if (pairings.length === 0) continue;
        for (const path of [token.path, ...pairings.map((p) => p.against)]) {
          const target = aliasTarget(byPath.get(path)?.value) ?? "";
          const value = primitives.get(target)?.value as { alpha?: number } | undefined;
          expect(value?.alpha, `${path} -> ${target}`).toBe(1);
        }
      }
    }
  });
});
