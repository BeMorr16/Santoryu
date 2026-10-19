import { expect, test, type Locator } from "@playwright/test";
import { section } from "./support.ts";

/** The icon's computed vertical-align and -0.125 × its font size, both in px. */
async function offsets(icon: Locator) {
  return icon.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      actual: Number.parseFloat(style.verticalAlign),
      expected: -0.125 * Number.parseFloat(style.fontSize),
      unit: style.verticalAlign.replace(/^-?[\d.]+/, ""),
    };
  });
}

test.describe("inline icons sit -0.125em below the baseline (refinement R1.1, R1.2)", () => {
  test("in running text", async ({ page }) => {
    await page.goto("/lab/components#icon");

    const icon = section(page, "Icon").getByText("Deployed through GitHub Actions.").locator("svg");
    const { actual, expected, unit } = await offsets(icon);
    expect(unit).toBe("px");
    expect(actual).toBeCloseTo(expected, 2);
  });

  test("in Link's new-tab icon, with no override of its own", async ({ page }) => {
    await page.goto("/lab/components#link");

    const icon = section(page, "Link")
      .getByRole("link", { name: /^GitHub ?, opens in new tab$/ })
      .first()
      .locator("svg");
    const { actual, expected, unit } = await offsets(icon);
    expect(unit).toBe("px");
    expect(actual).toBeCloseTo(expected, 2);
  });
});
