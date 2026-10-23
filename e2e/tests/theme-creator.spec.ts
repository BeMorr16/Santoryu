import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { themeCreatorPath } from "../../web/src/design-system/components/pages.ts";
import { tabKey } from "./support.ts";

/** Replaces a color key control's hex text; it applies as soon as it parses. */
async function setHex(page: Page, control: string, hex: string) {
  const field = page.getByRole("group", { name: control, exact: true }).getByRole("textbox", {
    name: "Hex",
  });
  await field.fill(hex);
}

const preview = (page: Page) => page.getByRole("region", { name: "Preview" });

test.describe("theme creator (theme-creator R16.3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(themeCreatorPath);
    await expect(page.getByRole("textbox", { name: "Theme name" })).toBeVisible();
  });

  test("an Action color change restyles the preview's primary button, and only the preview", async ({
    page,
  }) => {
    await setHex(page, "Action", "#2a8556");

    await expect(preview(page).getByRole("button", { name: "Primary", exact: true })).toHaveCSS(
      "background-color",
      "rgb(42, 133, 86)",
    );
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--color-action-background"),
      ),
    ).not.toBe("#2a8556");
  });

  test("a saved theme chosen in the switcher applies on the next page before any app script runs (R9.3)", async ({
    page,
  }) => {
    await page.getByRole("textbox", { name: "Theme name" }).fill("Ocean");
    // Dark enough for white text at 4.5:1, so Save has no contrast warning to show.
    await setHex(page, "Action", "#1a5f7a");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved Ocean")).toBeVisible();

    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Theme/ })
      .click();
    await page.getByRole("menuitemradio", { name: "Ocean" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);

    // Only the inline pre-paint script can run: every JS file is blocked.
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/design-system/tokens", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-action-background")
          .trim(),
      ),
    ).toBe("#1a5f7a");
  });

  test("has no axe violations with a custom theme selected site-wide (R15.4)", async ({ page }) => {
    await page.getByRole("textbox", { name: "Theme name" }).fill("Forest");
    await setHex(page, "Action", "#1e6b45");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved Forest")).toBeVisible();
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Theme/ })
      .click();
    await page.getByRole("menuitemradio", { name: "Forest" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(
      violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.target.join(" ")}`)),
    ).toEqual([]);
  });

  test("the contrast warning keeps focus inside, closes on Escape and returns focus to Save (R3.3)", async ({
    page,
    browserName,
  }) => {
    await page.getByRole("textbox", { name: "Theme name" }).fill("Pale");
    await setHex(page, "Second accent", "#f4f0fd");
    // From the keyboard: WebKit, like Safari, doesn't focus a button on a click, so a click
    // leaves no focused opener to return to.
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("alertdialog", { name: /contrast issues?$/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeFocused();
    // Focus may step out to the browser's own UI (the body, from the page's side), but never to
    // the page behind the modal, which is inert.
    for (let press = 0; press < 12; press++) {
      await page.keyboard.press(tabKey(browserName));
      expect(
        await dialog.evaluate(
          (element) =>
            document.activeElement === document.body || element.contains(document.activeElement),
        ),
        `Tab ${String(press + 1)}`,
      ).toBe(true);
    }
    await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(save).toBeFocused();
  });
});

test("Escape on a dialog's Close tooltip hides the tooltip and leaves the dialog open (theme-creator R12.4)", async ({
  page,
  browserName,
}) => {
  await page.goto("/design-system/components/dialog");
  await page.getByRole("button", { name: "Delete theme" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Ocean”?" });
  await expect(dialog.getByRole("button", { name: "Keep theme" })).toBeFocused();

  // Back from the first action to Close, by keyboard: its name tooltip shows.
  await page.keyboard.press(tabKey(browserName, true));
  const close = dialog.getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();
  // A name tooltip repeats the name, so it's hidden from assistive technology (refinement R14.12).
  const tooltip = close.locator("xpath=following-sibling::span[@popover][1]");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Close");

  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
