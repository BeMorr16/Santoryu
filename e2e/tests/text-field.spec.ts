import { expect, test } from "@playwright/test";
import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { example, main } from "./support.ts";

test.describe("TextField (ds-tokens R10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("text-field"));
  });

  test("keeps its boundary and focus ring under forced colors (R10.10)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const field = example(main(page), "Hint").getByRole("textbox", { name: "Username" });

    await expect(field).toHaveCSS("border-top-style", "solid");
    await expect(field).not.toHaveCSS("border-top-width", "0px");
    await field.focus();
    await page.keyboard.type("a");
    await expect(field).toHaveCSS("outline-style", "solid");
    await expect(field).not.toHaveCSS("outline-width", "0px");
  });

  test("hides a search field's icon while focused, and the text takes its place (R10.7)", async ({
    page,
  }) => {
    const search = example(main(page), "Search");
    const field = search.getByRole("searchbox", { name: "Search the docs" });
    const icon = search.locator("svg").first();
    const textLeft = () =>
      field.evaluate((element) => {
        const style = getComputedStyle(element);
        return element.getBoundingClientRect().left + parseFloat(style.paddingInlineStart);
      });
    await expect(icon).toBeVisible();
    const iconLeft = (await icon.boundingBox())?.x ?? -1;
    expect(await textLeft()).toBeGreaterThan(iconLeft);

    await field.focus();

    await expect(icon).toBeHidden();
    expect(await textLeft()).toBeCloseTo(iconLeft, 0);

    await field.blur();
    await expect(icon).toBeVisible();
    expect(await textLeft()).toBeGreaterThan(iconLeft);
  });
});
