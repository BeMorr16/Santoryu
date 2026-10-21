import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const thisFile = fileURLToPath(import.meta.url);

/** Source roots and files that must use the section's new name (ds-components R1.8, design §2). */
const roots = [
  "web/src",
  "web/scripts",
  "web/test",
  "e2e/tests",
  "infra/src",
  "infra/test",
  "CLAUDE.md",
];
const skippedDirectories = new Set(["node_modules", "generated"]);
const binaryExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".woff2"]);
const oldName = [/\/lab\b/, /\bLab\b/, /\blab-/];
/** The tests that check the old paths are gone (R1.2) have to name them. */
const checksOldPaths = new Set(["e2e/tests/health.spec.ts", "web/test/build/docs-pages.test.ts"]);

function filesUnder(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) return [];
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

const files = roots
  .flatMap((root) => filesUnder(join(repoRoot, root)))
  .filter((file) => file !== thisFile);

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
