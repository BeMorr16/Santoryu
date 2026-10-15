import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
