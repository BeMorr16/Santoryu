import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { buildTokens, durationTransform } from "./build-tokens.ts";

const color = (hex: string) => ({
  colorSpace: "srgb",
  components: [0, 0, 0],
  alpha: 1,
  hex,
});

const validColor = {
  color: {
    $type: "color",
    gray: { 0: { $value: color("#000000"), $description: "Black." } },
  },
};

const validTheme = {
  color: {
    $type: "color",
    text: { default: { $value: "{color.gray.0}", $description: "Text." } },
  },
};

/** Whether a top-level style rule matching `element` declares `name`. (@media rules are skipped.) */
function declares(element: Element, name: string): boolean {
  return [...element.ownerDocument.styleSheets].some((sheet) =>
    [...sheet.cssRules].some(
      (rule) =>
        rule instanceof CSSStyleRuleOf(element) &&
        rule.style.getPropertyValue(name) !== "" &&
        element.matches(rule.selectorText),
    ),
  );
}

/**
 * A custom property's computed value. jsdom cascades and inherits custom properties but never
 * substitutes var(). Per CSS Variables, substitution happens on the element that declares the
 * property and the result is inherited, so resolve each var() on the nearest declaring element.
 */
function computedCustomProperty(element: Element, name: string): string {
  let declaring: Element | null = element;
  while (declaring && !declares(declaring, name)) declaring = declaring.parentElement;
  if (!declaring) return "";
  const at = declaring;
  const raw = getComputedStyleOf(at).getPropertyValue(name).trim();
  return raw.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_match, ref: string) =>
    computedCustomProperty(at, ref),
  );
}

function windowOf(element: Element): Window & typeof globalThis {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error("element has no window");
  return view;
}

const getComputedStyleOf = (element: Element) => windowOf(element).getComputedStyle(element);
const CSSStyleRuleOf = (element: Element) => windowOf(element).CSSStyleRule;

const tempDirs: string[] = [];

async function fixture(
  files: Record<string, unknown>,
): Promise<{ tokensDir: string; outDir: string }> {
  const root = await mkdtemp(join(tmpdir(), "build-tokens-"));
  tempDirs.push(root);
  const tokensDir = join(root, "tokens");
  await mkdir(join(tokensDir, "themes"), { recursive: true });
  const defaults = {
    "color.json": validColor,
    "themes/light.json": validTheme,
    "themes/dark.json": validTheme,
    "themes/reduced-motion.json": {},
  };
  for (const [name, content] of Object.entries({ ...defaults, ...files })) {
    await mkdir(dirname(join(tokensDir, name)), { recursive: true });
    await writeFile(join(tokensDir, name), JSON.stringify(content));
  }
  return { tokensDir, outDir: join(root, "generated") };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("buildTokens", () => {
  it("writes tokens.css and tokens.ts for a valid token set", async () => {
    const dirs = await fixture({});

    await buildTokens(dirs);

    const css = await readFile(join(dirs.outDir, "tokens.css"), "utf8");
    const ts = await readFile(join(dirs.outDir, "tokens.ts"), "utf8");
    expect(css).toContain("--color-text-default: #000000;");
    expect(ts).toContain('"cssVar": "--color-text-default"');
  });

  it("rejects a broken alias, naming the token path", async () => {
    const dirs = await fixture({
      "themes/light.json": {
        color: {
          $type: "color",
          text: { default: { $value: "{color.gray.999}", $description: "Text." } },
        },
      },
    });

    await expect(buildTokens(dirs)).rejects.toThrow(/color\.text\.default/);
  });

  it("rejects a token with no $type, naming the token path", async () => {
    const dirs = await fixture({
      "space.json": { space: { 4: { $value: "1rem", $description: "No type here." } } },
    });

    await expect(buildTokens(dirs)).rejects.toThrow(/space\.4.*\$type|\$type.*space\.4/);
  });
});

describe("buildTokens: component tier and scoped themes (design §4.4)", () => {
  const twoGrays = {
    color: {
      $type: "color",
      gray: {
        0: { $value: color("#000000"), $description: "Black." },
        1: {
          $value: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1, hex: "#ffffff" },
          $description: "White.",
        },
      },
    },
  };
  const textTheme = (primitive: string) => ({
    color: {
      $type: "color",
      text: { default: { $value: `{color.gray.${primitive}}`, $description: "Text." } },
    },
  });
  const typeTokens = {
    type: {
      "letter-spacing": {
        $type: "number",
        16: { $value: 0.16, $description: "Wide tracking." },
      },
      "line-height": {
        $type: "number",
        tight: { $value: 1.2, $description: "Tight leading." },
      },
      "line-length": {
        $type: "number",
        65: { $value: 65, $description: "65ch." },
      },
      tracking: {
        $type: "number",
        label: { $value: "{type.letter-spacing.16}", $description: "Label tracking." },
      },
      leading: {
        $type: "number",
        heading: { $value: "{type.line-height.tight}", $description: "Heading leading." },
      },
      measure: {
        $type: "number",
        text: { $value: "{type.line-length.65}", $description: "Text measure." },
      },
    },
  };
  const buttonTokens = {
    component: {
      button: {
        $type: "color",
        text: {
          $value: "{color.text.default}",
          $description: "Button text.",
          $extensions: {
            "personal-site.contrast": [{ against: "color.text.default", min: "text" }],
          },
        },
      },
    },
  };

  async function build(extra: Record<string, unknown> = {}) {
    const dirs = await fixture({
      "color.json": twoGrays,
      "type.json": typeTokens,
      "themes/light.json": textTheme("0"),
      "themes/dark.json": textTheme("1"),
      "components/button.json": buttonTokens,
      ...extra,
    });
    const tokens = await buildTokens(dirs);
    const css = await readFile(join(dirs.outDir, "tokens.css"), "utf8");
    return { tokens, css };
  }

  /** Top-level rule preludes in order, with `@media` blocks flattened to "@media … inner". */
  function selectors(css: string): string[] {
    const result: string[] = [];
    const pattern = /([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(pattern)) {
      const selector = (match[1] ?? "").trim().replace(/\s+/g, " ");
      const inner = /([^{}]+)\{/.exec(match[2] ?? "");
      result.push(
        selector.startsWith("@media") && inner
          ? `${selector} ${(inner[1] ?? "").trim().replace(/\s+/g, " ")}`
          : selector,
      );
    }
    return result;
  }

  function block(css: string, selector: string): string {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`No ${selector} block`);
    return css.slice(start, css.indexOf("}", start));
  }

  it("reads tokens/components/*.json", async () => {
    const { tokens } = await build();

    expect(tokens.map((t) => t.name)).toContain("component.button.text");
  });

  it("gives component tokens tier, component, aliases and resolved light/dark values", async () => {
    const { tokens } = await build();

    const button = tokens.find((t) => t.name === "component.button.text");
    expect(button).toMatchObject({
      tier: "component",
      component: "button",
      aliases: "color.text.default",
      cssVar: "--component-button-text",
      css: "var(--color-text-default)",
      category: "color",
      description: "Button text.",
      contrast: [{ against: "color.text.default", min: "text" }],
      values: {
        light: { css: "#000000", ref: "color.gray.0", srgb: [0, 0, 0], alpha: 1 },
        dark: { css: "#ffffff", ref: "color.gray.1" },
      },
    });
    expect(tokens.find((t) => t.name === "color.text.default")).toMatchObject({
      tier: "semantic",
    });
  });

  it("emits the blocks of §4.4, in order", async () => {
    const { css } = await build();

    expect(selectors(css)).toEqual([
      ":root",
      '@media (prefers-color-scheme: dark) :root:not([data-theme="light"])',
      '[data-theme="dark"]',
      '[data-theme="light"]',
      ":root, [data-theme]",
      "@media (prefers-reduced-motion: reduce) :root",
    ]);
  });

  it("puts the dark set under [data-theme=dark] and the full light set under [data-theme=light]", async () => {
    const { css } = await build();

    expect(block(css, '[data-theme="dark"]')).toContain("--color-text-default: #ffffff;");
    const light = block(css, '[data-theme="light"]');
    expect(light).toContain("color-scheme: light;");
    expect(light).toContain("--color-text-default: #000000;");
  });

  it("emits component tokens as var() references, only in the `:root, [data-theme]` block", async () => {
    const { css } = await build();

    expect(block(css, ":root,\n[data-theme]")).toContain(
      "--component-button-text: var(--color-text-default);",
    );
    expect(css.match(/--component-button-text:/g)).toHaveLength(1);
  });

  it("emits type.letter-spacing numbers with em, type.line-length with ch, and no other numbers", async () => {
    const { css } = await build();

    expect(css).toContain("--type-tracking-label: 0.16em;");
    expect(css).toContain("--type-measure-text: 65ch;");
    expect(css).toContain("--type-leading-heading: 1.2;");
  });

  it("re-resolves component tokens inside a scoped data-theme=light element in a dark page", async () => {
    const { css } = await build();
    const { document } = new JSDOM(
      `<html data-theme="dark"><head><style>${css}</style></head><body>` +
        `<div data-theme="light"><span id="inside"></span></div><span id="outside"></span>` +
        `</body></html>`,
    ).window;

    const inside = document.getElementById("inside");
    const outside = document.getElementById("outside");
    if (!inside || !outside) throw new Error("fixture elements missing");
    expect(computedCustomProperty(inside, "--component-button-text")).toBe("#000000");
    expect(computedCustomProperty(outside, "--component-button-text")).toBe("#ffffff");
  });

  it("rejects a component token that is not exactly one alias, naming the token", async () => {
    await expect(
      build({
        "components/button.json": {
          component: {
            button: { $type: "color", text: { $value: color("#000000"), $description: "Raw." } },
          },
        },
      }),
    ).rejects.toThrow(/component\.button\.text/);
  });
});

describe("duration/dtcg-css transform", () => {
  const token = (value: unknown, type = "duration") => ({
    $value: value,
    $type: type,
    name: "t",
    path: ["t"],
    original: { $value: value },
    filePath: "x.json",
    isSource: true,
  });

  it("converts a DTCG duration object to a CSS time", () => {
    expect(durationTransform.transform(token({ value: 150, unit: "ms" }))).toBe("150ms");
    expect(durationTransform.transform(token({ value: 0.5, unit: "s" }))).toBe("0.5s");
  });

  it("only applies to duration tokens with object values", () => {
    expect(durationTransform.filter(token({ value: 150, unit: "ms" }))).toBe(true);
    expect(durationTransform.filter(token("{motion.time.150}"))).toBe(false);
    expect(durationTransform.filter(token({ value: 1, unit: "rem" }, "dimension"))).toBe(false);
  });
});
