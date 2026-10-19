import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { componentTokens, semanticTokens } from "../src/tokens/metadata.ts";

// CSS named colors (CSS Color Module Level 4), minus the allowed keywords.
const namedColors = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
  brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue
  darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange
  darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise
  darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia
  gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo
  ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue
  lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon
  mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
  mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
  paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red
  rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue
  slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen`.split(/\s+/),
);

const allowedCustomProperties = new Set(["--specimen"]);

interface TokenSets {
  semantic: ReadonlySet<string>;
  /** Component kebab name → that component's token CSS variables. */
  byComponent: ReadonlyMap<string, ReadonlySet<string>>;
}

type Owner = { kind: "component"; component: string } | { kind: "lab" } | { kind: "other" };

const kebab = (pascal: string) => pascal.replace(/(?<!^)([A-Z])/g, "-$1").toLowerCase();

/**
 * Which component a CSS file belongs to. `src/components/<Pascal>/…` is `<kebab>`, and shared
 * styles named `src/components/shared/<kebab>-styles.module.css` belong to `<kebab>` (Button's
 * look is shared by Link and MenuTrigger, design §4.3). Other shared styles, such as
 * `shared/layout.module.css` (Stack and Grid, refinement R6.5), belong to `<kebab>` too, which
 * has no tokens, so they get semantic tokens and private --_* properties only.
 */
function ownerOf(file: string): Owner {
  const shared = /^src\/components\/shared\/([a-z-]+?)(?:-styles)?\.module\.css$/.exec(file);
  if (shared?.[1]) return { kind: "component", component: shared[1] };
  const own = /^src\/components\/([A-Z][A-Za-z]*)\//.exec(file);
  if (own?.[1]) return { kind: "component", component: kebab(own[1]) };
  if (file.startsWith("src/lab/")) return { kind: "lab" };
  return { kind: "other" };
}

/**
 * Reports raw color literals, custom properties a file may not reference, and component-token
 * overrides outside src/lab/ (site-foundation R5.7, component-library R2.5).
 * Returns one `file:line: message` string per problem.
 */
function scanCss(source: string, file: string, tokens: TokenSets): string[] {
  // Blank out comments, keeping newlines so line numbers stay correct.
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const lineAt = (index: number) => text.slice(0, index).split("\n").length;
  const problems: string[] = [];
  const report = (index: number, message: string) => {
    problems.push(`${file}:${String(lineAt(index))}: ${message}`);
  };
  const owner = ownerOf(file);
  const own = owner.kind === "component" ? tokens.byComponent.get(owner.component) : undefined;
  const knownComponentToken = (name: string) =>
    [...tokens.byComponent.values()].some((vars) => vars.has(name));

  const canReference = (name: string) =>
    tokens.semantic.has(name) ||
    (owner.kind === "component"
      ? (own?.has(name) ?? false) || /^--_[\w-]+$/.test(name)
      : allowedCustomProperties.has(name));
  const notAllowed = (name: string) =>
    owner.kind === "component"
      ? `${name} is not a semantic token, a ${owner.component} component token or a private --_* property`
      : `${name} is not a semantic token`;

  for (const declaration of text.matchAll(/([\w-]+)(\s*:\s*)([^;{}]+)(?=[;}])/g)) {
    const [, property = "", separator = "", value = ""] = declaration;
    const start = declaration.index + property.length + separator.length;

    if (property.startsWith("--component-") && owner.kind !== "component") {
      if (owner.kind !== "lab") {
        report(declaration.index, `${property} may only be overridden in src/lab/`);
      } else if (!knownComponentToken(property)) {
        report(declaration.index, `${property} is not a component token`);
      }
    }

    for (const ref of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const name = ref[1] ?? "";
      if (!canReference(name)) report(start + ref.index, notAllowed(name));
    }

    // Blank out custom property names so `var(--color-red)` isn't read as a named color.
    const literal = value.replace(/--[\w-]+/g, (name) => " ".repeat(name.length));
    for (const hex of literal.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
      report(start + hex.index, `raw color ${hex[0]}`);
    }
    for (const fn of literal.matchAll(
      /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi,
    )) {
      report(start + fn.index, `raw color function ${fn[1] ?? ""}()`);
    }
    for (const word of literal.matchAll(/(?<![\w-])[a-z]+(?![\w-])/gi)) {
      if (namedColors.has(word[0].toLowerCase())) {
        report(start + word.index, `named color ${word[0]}`);
      }
    }
  }
  return problems;
}

/** Component tokens never referenced by their component's CSS (R2.7, second half). */
function unusedComponentTokens(files: { file: string; source: string }[], tokens: TokenSets) {
  const referenced = new Map<string, Set<string>>();
  for (const { file, source } of files) {
    const owner = ownerOf(file);
    if (owner.kind !== "component") continue;
    const names = referenced.get(owner.component) ?? new Set<string>();
    for (const ref of source.matchAll(/var\(\s*(--[\w-]+)/g)) names.add(ref[1] ?? "");
    referenced.set(owner.component, names);
  }
  return [...tokens.byComponent].flatMap(([component, vars]) =>
    [...vars]
      .filter((name) => !referenced.get(component)?.has(name))
      .map((name) => `${name} is not used by ${component}'s CSS`),
  );
}

function groupByComponent(
  entries: readonly { component: string; cssVar: string }[],
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const { component, cssVar } of entries) {
    result.set(component, (result.get(component) ?? new Set()).add(cssVar));
  }
  return result;
}

const realTokens: TokenSets = {
  semantic: new Set(semanticTokens.map((t) => t.cssVar)),
  byComponent: groupByComponent(componentTokens),
};

const fixtureTokens: TokenSets = {
  semantic: realTokens.semantic,
  byComponent: groupByComponent([
    { component: "button", cssVar: "--component-button-radius" },
    { component: "button", cssVar: "--component-button-gap" },
    { component: "menu", cssVar: "--component-menu-popup-radius" },
  ]),
};

describe("scanCss self-test", () => {
  it("reports each kind of violation with file and line", () => {
    const fixture = [
      ".a {",
      "  color: #fff;",
      "  background: rgb(0 0 0);",
      "  border-color: oklch(50% 0.1 200);",
      "  color: red;",
      "  color: var(--color-gray-600);",
      "  margin: var(--nope);",
      "  outline: 1px solid hsl(0 0% 0%);",
      "}",
      "",
    ].join("\n");

    expect(scanCss(fixture, "bad.css", fixtureTokens)).toEqual([
      "bad.css:2: raw color #fff",
      "bad.css:3: raw color function rgb()",
      "bad.css:4: raw color function oklch()",
      "bad.css:5: named color red",
      "bad.css:6: --color-gray-600 is not a semantic token",
      "bad.css:7: --nope is not a semantic token",
      "bad.css:8: raw color function hsl()",
    ]);
  });

  it("allows keywords, semantic tokens, --specimen, selectors and media queries", () => {
    const fixture = [
      "/* color: red; #fff */",
      "#main:focus:not(:focus-visible),",
      "a:hover {",
      "  color: currentColor;",
      "  background: transparent;",
      "  border-color: inherit;",
      "  background-color: var(--specimen);",
      "  color: var(--color-text-default);",
      "  font-family: var(--type-family-body);",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  a { transition-duration: var(--motion-duration-fast); }",
      "}",
      "",
    ].join("\n");

    expect(scanCss(fixture, "good.css", fixtureTokens)).toEqual([]);
  });

  it("in a component's CSS, allows semantic tokens, its own component tokens and --_* only", () => {
    const fixture = [
      ".a {",
      "  --_min: var(--size-column-md);",
      "  border-radius: var(--component-button-radius);",
      "  gap: var(--_gap, var(--space-inline-sm));",
      "  color: var(--color-gray-600);",
      "  border-radius: var(--component-menu-popup-radius);",
      "  margin: var(--nope);",
      "  background: var(--specimen);",
      "}",
      "",
    ].join("\n");
    const button = "src/components/Button/Button.module.css";
    const why = "is not a semantic token, a button component token or a private --_* property";

    expect(scanCss(fixture, button, fixtureTokens)).toEqual([
      `${button}:5: --color-gray-600 ${why}`,
      `${button}:6: --component-menu-popup-radius ${why}`,
      `${button}:7: --nope ${why}`,
      `${button}:8: --specimen ${why}`,
    ]);
  });

  it("maps shared/<kebab>-styles.module.css and PascalCase directories to their component", () => {
    const fixture = ".a { border-radius: var(--component-button-radius); }\n";

    expect(
      scanCss(fixture, "src/components/shared/button-styles.module.css", fixtureTokens),
    ).toEqual([]);
    expect(scanCss(fixture, "src/components/Menu/Menu.module.css", fixtureTokens)).toEqual([
      "src/components/Menu/Menu.module.css:1: --component-button-radius is not a semantic token, a menu component token or a private --_* property",
    ]);
  });

  it("gives other shared/<kebab>.module.css files semantic tokens and --_* only", () => {
    const fixture = [
      ".a {",
      "  --_row: var(--space-stack-sm);",
      "  gap: var(--_row) var(--space-inline-sm);",
      "  border-radius: var(--component-button-radius);",
      "  background: var(--specimen);",
      "}",
      "",
    ].join("\n");
    const layout = "src/components/shared/layout.module.css";
    const why = "is not a semantic token, a layout component token or a private --_* property";

    expect(scanCss(fixture, layout, fixtureTokens)).toEqual([
      `${layout}:4: --component-button-radius ${why}`,
      `${layout}:5: --specimen ${why}`,
    ]);
  });

  it("allows --component-* outside components only as a known override target in src/lab/", () => {
    const fixture = [
      ".a {",
      "  --component-button-radius: var(--radius-pill);",
      "  --component-button-nope: var(--radius-pill);",
      "  border-radius: var(--component-button-radius);",
      "}",
      "",
    ].join("\n");

    expect(scanCss(fixture, "src/lab/components/Custom.module.css", fixtureTokens)).toEqual([
      "src/lab/components/Custom.module.css:3: --component-button-nope is not a component token",
      "src/lab/components/Custom.module.css:4: --component-button-radius is not a semantic token",
    ]);
    expect(scanCss(fixture, "src/shell/SiteShell.module.css", fixtureTokens)).toEqual([
      "src/shell/SiteShell.module.css:2: --component-button-radius may only be overridden in src/lab/",
      "src/shell/SiteShell.module.css:3: --component-button-nope may only be overridden in src/lab/",
      "src/shell/SiteShell.module.css:4: --component-button-radius is not a semantic token",
    ]);
  });

  it("reports component tokens their component's CSS never references", () => {
    const files = [
      {
        file: "src/components/shared/button-styles.module.css",
        source: ".a { border-radius: var(--component-button-radius); }",
      },
      { file: "src/lab/x.module.css", source: ".a { gap: var(--component-button-gap); }" },
    ];

    expect(unusedComponentTokens(files, fixtureTokens)).toEqual([
      "--component-button-gap is not used by button's CSS",
      "--component-menu-popup-radius is not used by menu's CSS",
    ]);
  });
});

describe("web/src CSS", () => {
  const webDir = fileURLToPath(new URL("..", import.meta.url));
  const files = globSync("src/**/*.css", { cwd: webDir, exclude: ["src/generated/**"] }).map(
    (file) => ({ file, source: readFileSync(new URL(`../${file}`, import.meta.url), "utf8") }),
  );

  it("finds the CSS files to scan", () => {
    expect(files.map(({ file }) => file)).toContain("src/styles/global.css");
  });

  it("uses only the tokens each file may use, and no raw colors", () => {
    const problems = files.flatMap(({ file, source }) => scanCss(source, file, realTokens));
    expect(problems).toEqual([]);
  });

  it("references every component token from its own component's CSS", () => {
    expect(unusedComponentTokens(files, realTokens)).toEqual([]);
  });
});
