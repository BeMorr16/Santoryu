import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

async function ruleIdsFor(code: string, fileName: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `web/test/lint-fixtures/${fileName}` });
  return result?.messages.map((message) => message.ruleId ?? message.message) ?? [];
}

describe("ESLint config canary", () => {
  it("reports jsx-a11y/alt-text for an image without alt text", async () => {
    const code = `export function Fixture() {\n  return <img src="x.png" />;\n}\n`;

    expect(await ruleIdsFor(code, "jsx.tsx")).toContain("jsx-a11y/alt-text");
  });

  it("allows tabIndex on a region but still reports it on other non-interactive elements", async () => {
    const code = [
      `export function Fixture() {`,
      `  return (`,
      `    <>`,
      `      <div role="region" aria-label="Scrollable" tabIndex={0} />`,
      `      <article tabIndex={0} />`,
      `    </>`,
      `  );`,
      `}`,
      ``,
    ].join("\n");

    const [result] = await eslint.lintText(code, { filePath: "web/test/lint-fixtures/jsx.tsx" });
    const lines = result?.messages
      .filter((message) => message.ruleId === "jsx-a11y/no-noninteractive-tabindex")
      .map((message) => message.line);
    expect(lines).toEqual([5]);
  });

  it("reports react-hooks/rules-of-hooks for a conditional hook call", async () => {
    const code = [
      `import { useState } from "react";`,
      `export function Fixture({ on }: { on: boolean }) {`,
      `  if (on) {`,
      `    useState(0);`,
      `  }`,
      `  return null;`,
      `}`,
      ``,
    ].join("\n");

    expect(await ruleIdsFor(code, "jsx.tsx")).toContain("react-hooks/rules-of-hooks");
  });

  it("reports @typescript-eslint/no-floating-promises for an unhandled promise", async () => {
    const code = `async function work(): Promise<void> {}\nwork();\n`;

    expect(await ruleIdsFor(code, "typed.ts")).toContain("@typescript-eslint/no-floating-promises");
  });

  it("lints CloudFront Functions as classic scripts without Node globals or unsupported syntax", async () => {
    const code = [
      `/* exported handler */`,
      `function handler(event) {`,
      `  for (const key of Object.keys(event)) {`,
      `    process.stdout.write(key);`,
      `  }`,
      `  return { ...event };`,
      `}`,
      ``,
    ].join("\n");

    const [result] = await eslint.lintText(code, { filePath: "infra/functions/fixture.js" });
    const messages = result?.messages.map(
      (message) => `${String(message.line)} ${message.ruleId ?? ""}`,
    );
    expect(messages).toEqual(["3 no-restricted-syntax", "4 no-undef", "6 no-restricted-syntax"]);
  });
});
