import { expect, test, type Locator } from "@playwright/test";
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

  test("sets the required and optional cues apart from the label (contact-form R15.3)", async ({
    page,
  }) => {
    const look = (element: Locator) =>
      element.evaluate((node) => {
        const { color, fontSize, fontWeight } = getComputedStyle(node);
        return { color, fontSize: parseFloat(fontSize), fontWeight: Number(fontWeight) };
      });

    for (const [title, cue] of [
      ["Required", "(required)"],
      ["Optional", "(optional)"],
    ] as const) {
      const label = example(main(page), title).locator("label");
      const labelLook = await look(label);
      const cueLook = await look(label.getByText(cue));

      expect(cueLook.fontSize).toBeLessThan(labelLook.fontSize);
      expect(cueLook.fontWeight).toBeLessThan(labelLook.fontWeight);
      expect(cueLook.color).not.toBe(labelLook.color);
    }
  });

  test("takes a multi-line message from the keyboard, then moves on with Tab (contact-form R15.1)", async ({
    page,
  }) => {
    const multiline = example(main(page), "Multiline");
    const field = multiline.getByRole("textbox", { name: "Message" });
    await expect(field).toHaveAccessibleDescription("A few lines is plenty.");
    await expect(field).toHaveCSS("resize", "vertical");

    await field.focus();
    await expect(field).toHaveCSS("outline-style", "solid");
    await page.keyboard.type("Line one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line two");
    await expect(field).toHaveValue("Line one\nLine two");

    await page.keyboard.press("Escape");
    await expect(field).toHaveValue("Line one\nLine two");

    await page.keyboard.press("Tab");
    await expect(field).not.toBeFocused();
  });

  test("starts a multiline field's first line where a single-line field's text sits (contact-form §7)", async ({
    page,
  }) => {
    const firstLineCenter = (name: string, title: string) =>
      example(main(page), title)
        .getByRole("textbox", { name })
        .evaluate((element) => {
          const style = getComputedStyle(element);
          const lineHeight = parseFloat(style.lineHeight);
          return element.tagName === "TEXTAREA"
            ? parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop) + lineHeight / 2
            : element.getBoundingClientRect().height / 2;
        });

    expect(await firstLineCenter("Message", "Multiline")).toBeCloseTo(
      await firstLineCenter("Username", "Hint"),
      0,
    );
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
