import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  example,
  openAllAccordions,
  pages,
  section,
  setAllPanels,
  storeTheme,
  themes,
} from "./support.ts";

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
      // Every component and its reference content, contrast included: about 28s in WebKit alone,
      // so the default 30s fails whenever the machine is busy.
      if (path === "/lab/components") test.setTimeout(60_000);
      await storeTheme(page, theme);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      // The folded reference content stays covered (refinement R13.15).
      if (path === "/lab/components") await openAllAccordions(page);

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
      // The whole page with contrast, as above.
      test.setTimeout(60_000);
      await storeTheme(page, pageTheme);
      await page.goto("/lab/components");

      expect(await setAllPanels(page, panelTheme)).toBe(14);
      await expect(
        page.locator(`[data-theme="${panelTheme.toLowerCase()}"][role="group"]`),
      ).toHaveCount(14);
      await openAllAccordions(page);

      expect(await violations(page)).toEqual([]);
    });
  }
});

for (const theme of themes) {
  test(`/lab/components in ${theme} with a tooltip open has no axe violations (refinement R14.15)`, async ({
    page,
  }) => {
    await storeTheme(page, theme);
    await page.goto("/lab/components");
    const controlled = example(section(page, "Tooltip"), "Controlled");
    await controlled.getByRole("button", { name: "Show", exact: true }).click();
    const popup = controlled.locator("[popover]");
    // Judged once faded in: axe can't sample a color midway.
    await expect(popup).toHaveCSS("opacity", "1");

    expect(await violations(page)).toEqual([]);
  });
}
