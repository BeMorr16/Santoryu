import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const thisFile = fileURLToPath(import.meta.url);

/**
 * Every file git would commit, outside the history in `specs/` and `docs/`, must use the section's
 * new name (ds-components R1.8, design §2).
 */
const skippedRoots = ["specs/", "docs/"];
/** Local-only instructions, kept out of the public repo by `.git/info/exclude`; read when present. */
const localOnly = [
  "CLAUDE.md",
  ".claude/agents",
  ".claude/hooks",
  ".claude/rules",
  ".claude/skills",
];
const binaryExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".woff2"]);
const oldName = [/\/lab\b/, /\bLab\b/, /\blab-/];
/** The tests that check the old paths are gone (R1.2) have to name them. */
const checksOldPaths = new Set(["e2e/tests/health.spec.ts", "web/test/build/docs-pages.test.ts"]);

function gitFiles(args: string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", ...args], { cwd: repoRoot, encoding: "utf8" })
    .split("\0")
    .filter((path) => path !== "");
}

const files = [
  ...gitFiles(["--cached", "--others", "--exclude-standard", "--deduplicate"]),
  ...gitFiles(["--others", "--", ...localOnly]),
]
  .filter((path) => !skippedRoots.some((root) => path.startsWith(root)))
  .map((path) => join(repoRoot, path))
  .filter((file) => file !== thisFile && existsSync(file));

describe("the old Lab name (R1.8)", () => {
  it("scans source files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("appears in no source path", () => {
    const paths = files.map((file) => `/${relative(repoRoot, file)}`);
    expect(paths.filter((path) => oldName.some((pattern) => pattern.test(path)))).toEqual([]);
  });

  it("appears in no source file", () => {
    const matches = files
      .filter((file) => !binaryExtensions.has(extname(file)))
      .filter((file) => !checksOldPaths.has(relative(repoRoot, file)))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            oldName.some((pattern) => pattern.test(line))
              ? [`${relative(repoRoot, file)}:${String(index + 1)}: ${line.trim()}`]
              : [],
          ),
      );
    expect(matches).toEqual([]);
  });

  it("is named only where a test checks the old paths are gone", () => {
    for (const file of checksOldPaths) {
      expect(readFileSync(join(repoRoot, file), "utf8")).toMatch(/\/lab\b/);
    }
  });
});
