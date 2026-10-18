import axe from "axe-core";

/** Same WCAG rule tags as the browser tests (design §11.3). */
export const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Fails with every axe violation's rule id and targets (R3.9). `color-contrast` is off: jsdom has
 * no layout, so contrast is checked in the browser tests and by the token contrast tests.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const { violations } = await axe.run(container, {
    runOnly: { type: "tag", values: wcagTags },
    rules: { "color-contrast": { enabled: false } },
  });
  if (violations.length === 0) return;
  const details = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `  ${violation.id}: ${node.target.join(" ")} (${violation.help})`,
    ),
  );
  throw new Error(`axe found ${String(violations.length)} violation(s):\n${details.join("\n")}`);
}
