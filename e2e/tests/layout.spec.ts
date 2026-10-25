import { expect, test } from "@playwright/test";
import { componentsPath } from "../../web/src/design-system/components/pages.ts";
import { componentPage, openAllAccordions, pages, tabKey } from "./support.ts";

test.describe("at 320px wide", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("Grid shows one column with no horizontal overflow (R9.2)", async ({ page }) => {
    const examples = (await componentPage(page, "grid")).getByRole("group", {
      name: "Grid examples",
    });
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

  test("the code sample scrolls inside its block, as a Tab stop, instead of the page scrolling sideways (refinement R15.4, R15.5)", async ({
    page,
  }) => {
    // Measured, not prerendered: at a wide window the CodeBlock page's Basic block fits and
    // drops its Tab stop, and narrowing again brings the Button sample's back.
    await page.setViewportSize({ width: 1280, height: 720 });
    const codeBlocks = await componentPage(page, "code-block");
    await expect(
      codeBlocks.getByRole("group", { name: "CodeBlock examples" }).locator("pre").first(),
    ).not.toHaveAttribute("tabindex");
    await page.setViewportSize({ width: 320, height: 640 });

    const code = (await componentPage(page, "button"))
      .getByRole("group", { name: "Button examples" })
      .locator("pre");
    expect(
      await code.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeGreaterThan(0);
    await expect(code).toHaveAttribute("tabindex", "0");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("no page scrolls sideways", async ({ page }) => {
    // Every docs page too (ds-components R2.7): about two dozen loads.
    test.slow();
    for (const path of pages) {
      await page.goto(path);
      // Folded content counts too (refinement R13.15).
      if (path.startsWith(componentsPath)) await openAllAccordions(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("link cards (R10.3, R10.5)", () => {
  test("a click on the card body follows the card's link", async ({ page }) => {
    const examples = (await componentPage(page, "card")).getByRole("group", {
      name: "Card examples",
    });

    // A real click where the text is: the link's overlay, not the body, is what it lands on.
    const text = examples.getByText("Every color, size and motion value");
    await text.scrollIntoViewIfNeeded();
    const box = await text.boundingBox();
    if (box === null) throw new Error("card text is not visible");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page).toHaveURL(/\/design-system\/tokens$/);
  });

  test("a nested control sits above the overlay, gets its own click and its own focus", async ({
    page,
    browserName,
  }) => {
    const card = (await componentPage(page, "card")).getByRole("group", {
      name: "Card examples",
    });
    const button = card.getByRole("button", { name: "Star (example)" });

    await button.scrollIntoViewIfNeeded();
    const hit = await button.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top !== null && element.contains(top);
    });
    expect(hit).toBe(true);
    await button.click();
    await expect(page).toHaveURL(/\/design-system\/components\/card$/);
    await card.getByRole("link", { name: /^Source on GitHub/ }).focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(button).toBeFocused();
  });
});
