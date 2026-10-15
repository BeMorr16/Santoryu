import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tokens } from "../src/generated/tokens.ts";

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

/**
 * Reports raw color literals and custom properties that aren't semantic tokens (R5.7).
 * Returns one `file:line: message` string per problem.
 */
function scanCss(source: string, file: string, semantic: ReadonlySet<string>): string[] {
  // Blank out comments, keeping newlines so line numbers stay correct.
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const lineAt = (index: number) => text.slice(0, index).split("\n").length;
  const problems: string[] = [];
  const report = (index: number, message: string) => {
    problems.push(`${file}:${String(lineAt(index))}: ${message}`);
  };

  for (const declaration of text.matchAll(/([\w-]+)(\s*:\s*)([^;{}]+)(?=[;}])/g)) {
    const [, property = "", separator = "", value = ""] = declaration;
    const start = declaration.index + property.length + separator.length;

    for (const ref of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const name = ref[1] ?? "";
      if (!semantic.has(name) && !allowedCustomProperties.has(name)) {
        report(start + ref.index, `${name} is not a semantic token`);
      }
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

const semantic = new Set(tokens.map((token) => token.cssVar));

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

    expect(scanCss(fixture, "bad.css", semantic)).toEqual([
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

    expect(scanCss(fixture, "good.css", semantic)).toEqual([]);
  });
});

describe("web/src CSS", () => {
  const webDir = fileURLToPath(new URL("..", import.meta.url));
  const files = globSync("src/**/*.css", { cwd: webDir, exclude: ["src/generated/**"] });

  it("finds the CSS files to scan", () => {
    expect(files).toContain("src/styles/global.css");
  });

  it("uses only semantic tokens and no raw colors", () => {
    const problems = files.flatMap((file) =>
      scanCss(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), file, semantic),
    );
    expect(problems).toEqual([]);
  });
});
