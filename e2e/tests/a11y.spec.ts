import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { pages, setAllPanels, storeTheme, themes } from "./support.ts";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${violation.id}: ${node.target.join(" ")} — ${node.failureSummary ?? ""}`,
    ),
  );
}

for (const theme of themes) {
  for (const path of pages) {
    test(`${path} in ${theme} has no axe violations, contrast included (R16.2)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      expect(await violations(page)).toEqual([]);
    });
  }
}

test.describe("preview panels", () => {
  // Contrast is judged on settled colors: with no transitions, axe can't sample a color midway.
  test.use({ reducedMotion: "reduce" });

  for (const [pageTheme, panelTheme] of [
    ["dark", "Light"],
    ["light", "Dark"],
  ] as const) {
    test(`/lab/components with every panel set to ${panelTheme} in a ${pageTheme} page has no axe violations (R16.3)`, async ({
      page,
    }) => {
      await storeTheme(page, pageTheme);
      await page.goto("/lab/components");

      expect(await setAllPanels(page, panelTheme)).toBe(11);
      await expect(
        page.locator(`[data-theme="${panelTheme.toLowerCase()}"][role="group"]`),
      ).toHaveCount(11);

      expect(await violations(page)).toEqual([]);
    });
  }
});
