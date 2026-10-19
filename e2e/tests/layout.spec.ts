import { expect, test } from "@playwright/test";
import { section, tabKey } from "./support.ts";

test.describe("at 320px wide", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("Grid shows one column with no horizontal overflow (R9.2)", async ({ page }) => {
    await page.goto("/lab/components");

    const examples = section(page, "Grid").getByRole("group", { name: "Grid examples" });
    const grids = [
      ...(await examples.getByRole("list").all()),
      examples.getByRole("group", { name: "Projects to show" }),
    ];
    expect(grids).toHaveLength(9);
    // Measured, not read from grid-template-columns: Chromium reports a fieldset's as specified.
    for (const grid of grids) {
      const lefts = await grid.evaluate((element) =>
        [...element.children]
          .filter((child) => child.tagName !== "LEGEND")
          .map((child) => Math.round(child.getBoundingClientRect().left)),
      );
      expect(lefts.length).toBeGreaterThan(1);
      expect(new Set(lefts).size).toBe(1);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the code sample wraps instead of scrolling sideways", async ({ page }) => {
    await page.goto("/lab/components");

    const code = section(page, "Button").locator("pre");
    expect(
      await code.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(0);
  });

  test("no page scrolls sideways", async ({ page }) => {
    for (const path of ["/", "/lab", "/lab/tokens", "/lab/components", "/nope"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("link cards (R10.3, R10.5)", () => {
  test("a click on the card body follows the card's link", async ({ page }) => {
    await page.goto("/lab/components");

    await section(page, "Card").getByText("Every color, size and motion value").click();

    await expect(page).toHaveURL(/\/lab\/tokens$/);
  });

  test("a nested control sits above the overlay, gets its own click and its own focus", async ({
    page,
    browserName,
  }) => {
    await page.goto("/lab/components");
    const card = section(page, "Card");
    const button = card.getByRole("button", { name: "Star (example)" });

    await button.scrollIntoViewIfNeeded();
    const hit = await button.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top !== null && element.contains(top);
    });
    expect(hit).toBe(true);
    await button.click();
    await expect(page).toHaveURL(/\/lab\/components$/);
    await card.getByRole("link", { name: /^Source on GitHub/ }).focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(button).toBeFocused();
  });
});
