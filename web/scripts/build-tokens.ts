import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";
import { transformTypes } from "style-dictionary/enums";
import type { TransformedToken, ValueTransform } from "style-dictionary/types";
import {
  tokenCategories,
  type ComponentTokenMeta,
  type ContrastPairing,
  type SemanticTokenMeta,
  type TokenCategory,
  type TokenMeta,
  type TokenValue,
} from "../src/tokens/types.ts";

interface DtcgDuration {
  value: number;
  unit: "ms" | "s";
}

interface DtcgColor {
  components: [number, number, number];
  alpha?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDuration(value: unknown): value is DtcgDuration {
  return isRecord(value) && typeof value.value === "number" && typeof value.unit === "string";
}

function isColor(value: unknown): value is DtcgColor {
  return isRecord(value) && Array.isArray(value.components);
}

/** Style Dictionary 5.6's built-in CSS transforms leave DTCG 2025.10 duration objects untouched. */
export const durationTransform = {
  name: "duration/dtcg-css",
  type: transformTypes.value,
  filter: (token: TransformedToken) => token.$type === "duration" && isDuration(token.$value),
  transform: (token: TransformedToken) => {
    const { value, unit } = token.$value as DtcgDuration;
    return `${String(value)}${unit}`;
  },
} satisfies ValueTransform;

/**
 * Tracking has to scale with font size, but DTCG dimensions allow only px/rem, so
 * `type.letter-spacing.*` primitives are numbers and get `em` here (decision 0004 amendment).
 */
export const letterSpacingTransform = {
  name: "letter-spacing/em",
  type: transformTypes.value,
  filter: (token: TransformedToken) =>
    token.path[0] === "type" &&
    token.path[1] === "letter-spacing" &&
    typeof token.$value === "number",
  transform: (token: TransformedToken) => `${String(token.$value as number)}em`,
} satisfies ValueTransform;

/**
 * A text measure has to follow each element's own font, so `type.line-length.*` primitives are
 * numbers and get `ch` here, as letter spacing gets `em` (refinement R12.6).
 */
export const lineLengthTransform = {
  name: "line-length/ch",
  type: transformTypes.value,
  filter: (token: TransformedToken) =>
    token.path[0] === "type" && token.path[1] === "line-length" && typeof token.$value === "number",
  transform: (token: TransformedToken) => `${String(token.$value as number)}ch`,
} satisfies ValueTransform;

/**
 * An image cap has to follow the dynamic viewport, which DTCG dimensions (px/rem) can't say, so
 * `size.viewport-height.*` primitives are numbers and get `dvh` here (refinement R18.7).
 */
export const viewportHeightTransform = {
  name: "viewport-height/dvh",
  type: transformTypes.value,
  filter: (token: TransformedToken) =>
    token.path[0] === "size" &&
    token.path[1] === "viewport-height" &&
    typeof token.$value === "number",
  transform: (token: TransformedToken) => `${String(token.$value as number)}dvh`,
} satisfies ValueTransform;

const aliasPattern = /^\{([^{}]+)\}$/;

function aliasTarget(value: unknown): string | undefined {
  return typeof value === "string" ? aliasPattern.exec(value)?.[1] : undefined;
}

const tokenPath = (token: TransformedToken) => token.path.join(".");

async function jsonFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  return (await readdir(dir))
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(dir, file));
}

async function runPass(tokensDir: string, overrideFile: string): Promise<TransformedToken[]> {
  // Component tokens alias themed semantics, so every pass needs a full themed set. The light set
  // is the base; the pass's own override file replaces whatever it redefines.
  const lightTheme = join(tokensDir, "themes", "light.json");
  const include = [
    ...(await jsonFiles(tokensDir)),
    ...(await jsonFiles(join(tokensDir, "components"))),
    ...(overrideFile === "light.json" ? [] : [lightTheme]),
  ];
  const transforms = [
    durationTransform,
    letterSpacingTransform,
    lineLengthTransform,
    viewportHeightTransform,
  ];
  const sd = new StyleDictionary({
    include,
    source: [join(tokensDir, "themes", overrideFile)],
    hooks: { transforms: Object.fromEntries(transforms.map((t) => [t.name, t])) },
    log: { verbosity: "verbose", warnings: "error", errors: { brokenReferences: "throw" } },
    platforms: { css: { transformGroup: "css", transforms: transforms.map((t) => t.name) } },
  });
  const { allTokens } = await sd.getPlatformTokens("css");
  for (const token of allTokens) {
    if (typeof token.$type !== "string") {
      throw new Error(
        `Token ${tokenPath(token)} has no $type. Set $type on the token or a parent group.`,
      );
    }
  }
  return allTokens;
}

function cssValue(token: TransformedToken): string {
  const value: unknown = token.$value;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(
      `Token ${tokenPath(token)} did not resolve to a CSS value: ${JSON.stringify(value)}`,
    );
  }
  return String(value);
}

function tokenValue(token: TransformedToken, byPath: Map<string, TransformedToken>): TokenValue {
  const ref = aliasTarget(token.original.$value) ?? tokenPath(token);
  const value: TokenValue = { css: cssValue(token), ref };
  const primitive: unknown = byPath.get(ref)?.original.$value;
  if (token.$type === "color" && isColor(primitive)) {
    value.srgb = primitive.components;
    value.alpha = primitive.alpha ?? 1;
  }
  return value;
}

function extension(token: TransformedToken, key: string): unknown[] {
  const extensions: unknown = token.$extensions;
  const value = isRecord(extensions) ? extensions[key] : undefined;
  return Array.isArray(value) ? value : [];
}

const contrastOf = (token: TransformedToken) =>
  extension(token, "personal-site.contrast") as ContrastPairing[];

function contrastBackdropOf(token: TransformedToken): { contrastBackdrop?: string[] } {
  const backdrop = extension(token, "personal-site.contrast-backdrop") as string[];
  return backdrop.length > 0 ? { contrastBackdrop: backdrop } : {};
}

const isComponent = (token: TransformedToken) => token.path[0] === "component";
const isSemantic = (token: TransformedToken) =>
  !isComponent(token) && aliasTarget(token.original.$value) !== undefined;
const cssVar = (path: string): `--${string}` => `--${path.replaceAll(".", "-")}`;

function declarations(entries: [{ cssVar: string }, { css: string }][], indent: string): string {
  return entries.map(([meta, value]) => `${indent}${meta.cssVar}: ${value.css};`).join("\n");
}

/** Block structure and order: design §4.4. */
function renderCss(semantic: SemanticTokenMeta[], component: ComponentTokenMeta[]): string {
  type Entry = [SemanticTokenMeta, TokenValue];
  const themed = semantic.filter((t) => t.themed);
  const base = semantic.map((t): Entry => [t, t.themed ? t.values.light : t.values.all]);
  const light = themed.map((t): Entry => [t, t.values.light]);
  const dark = themed.map((t): Entry => [t, t.values.dark]);
  const reduced = semantic.flatMap((t): Entry[] =>
    !t.themed && t.values.reduced ? [[t, t.values.reduced]] : [],
  );
  const components = component.map((t): [ComponentTokenMeta, { css: string }] => [t, t]);
  return [
    "/* Generated by web/scripts/build-tokens.ts from web/tokens/. Do not edit. */",
    `:root {\n  color-scheme: light;\n${declarations(base, "  ")}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${declarations(dark, "    ")}\n  }\n}`,
    "/* Any element, so a preview panel can scope a theme (R15.7). */",
    `[data-theme="dark"] {\n  color-scheme: dark;\n${declarations(dark, "  ")}\n}`,
    `[data-theme="light"] {\n  color-scheme: light;\n${declarations(light, "  ")}\n}`,
    "/* Re-declared on every [data-theme] element so var() re-resolves against that theme (R2.3). */",
    `:root,\n[data-theme] {\n${declarations(components, "  ")}\n}`,
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n${declarations(reduced, "    ")}\n  }\n}`,
    "",
  ].join("\n");
}

function renderTs(tokens: TokenMeta[]): string {
  return [
    "// Generated by web/scripts/build-tokens.ts from web/tokens/. Do not edit.",
    'import type { TokenMeta } from "../tokens/types.ts";',
    "",
    `export const tokens = ${JSON.stringify(tokens, null, 2)} as const satisfies readonly TokenMeta[];`,
    "",
  ].join("\n");
}

export async function buildTokens({
  tokensDir,
  outDir,
}: {
  tokensDir: string;
  outDir: string;
}): Promise<TokenMeta[]> {
  const base = await runPass(tokensDir, "light.json");
  const dark = await runPass(tokensDir, "dark.json");
  const reduced = await runPass(tokensDir, "reduced-motion.json");

  const byPath = (all: TransformedToken[]) => new Map(all.map((t) => [tokenPath(t), t]));
  const basePaths = byPath(base);
  const darkPaths = byPath(dark);
  const reducedPaths = byPath(reduced);

  const categoryOf = (name: string): TokenCategory => {
    const category = name.split(".")[0] as TokenCategory;
    if (!tokenCategories.includes(category)) {
      throw new Error(`Token ${name} is not in a known category (${tokenCategories.join(", ")}).`);
    }
    return category;
  };

  const semantic = base.filter(isSemantic).map((token): SemanticTokenMeta => {
    const name = tokenPath(token);
    const common = {
      tier: "semantic" as const,
      name,
      cssVar: cssVar(name),
      category: categoryOf(name),
      type: String(token.$type),
      description: token.$description ?? "",
      contrast: contrastOf(token),
      ...contrastBackdropOf(token),
    };
    const darkToken = darkPaths.get(name);
    if (token.isSource) {
      if (darkToken?.isSource !== true) {
        throw new Error(`Token ${name} is in themes/light.json but not themes/dark.json.`);
      }
      return {
        ...common,
        themed: true,
        values: {
          light: tokenValue(token, basePaths),
          dark: tokenValue(darkToken, darkPaths),
        },
      };
    }
    const reducedToken = reducedPaths.get(name);
    return {
      ...common,
      themed: false,
      values: {
        all: tokenValue(token, basePaths),
        ...(reducedToken?.isSource === true
          ? { reduced: tokenValue(reducedToken, reducedPaths) }
          : {}),
      },
    };
  });
  semantic.sort(
    (a, b) => tokenCategories.indexOf(a.category) - tokenCategories.indexOf(b.category),
  );

  const semanticByName = new Map(semantic.map((t) => [t.name, t]));
  const component = base.filter(isComponent).map((token): ComponentTokenMeta => {
    const name = tokenPath(token);
    const aliases = aliasTarget(token.original.$value);
    const target = semanticByName.get(aliases ?? "");
    if (aliases === undefined || target === undefined) {
      throw new Error(
        `Component token ${name} must be exactly one alias to a semantic token, got ` +
          JSON.stringify(token.original.$value),
      );
    }
    const values = target.themed
      ? target.values
      : {
          light: target.values.all,
          dark: target.values.all,
          ...(target.values.reduced ? { reduced: target.values.reduced } : {}),
        };
    return {
      tier: "component",
      name,
      cssVar: cssVar(name),
      category: target.category,
      type: String(token.$type),
      description: token.$description ?? "",
      contrast: contrastOf(token),
      component: token.path[1] ?? "",
      aliases,
      css: `var(${target.cssVar})`,
      values,
    };
  });

  const tokens: TokenMeta[] = [...semantic, ...component];

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "tokens.css"), renderCss(semantic, component));
  await writeFile(join(outDir, "tokens.ts"), renderTs(tokens));
  return tokens;
}

if (import.meta.main) {
  const webDir = fileURLToPath(new URL("..", import.meta.url));
  const tokens = await buildTokens({
    tokensDir: join(webDir, "tokens"),
    outDir: join(webDir, "src", "generated"),
  });
  const count = (tier: TokenMeta["tier"]) => String(tokens.filter((t) => t.tier === tier).length);
  console.log(
    `Generated ${count("semantic")} semantic and ${count("component")} component tokens into src/generated/.`,
  );
}
