import { expect, test } from "@playwright/test";
import { chooseInMenu, componentPage, panelTrigger, storeTheme, tokenColor } from "./support.ts";

test("a panel set to Light inside a dark page restyles only itself (R15.6, R15.7)", async ({
  page,
}) => {
  await storeTheme(page, "dark");
  const main = await componentPage(page, "button");
  const insidePanel = main
    .getByRole("group", { name: "Button examples" })
    .getByRole("button", { name: "Primary", exact: true });
  // The main example's own panel, which keeps the page's theme (ds-components R4.4).
  const outsidePanel = main
    .getByRole("group", { name: "Button example", exact: true })
    .getByRole("button", { name: "Save changes" });
  const colors = (locator: typeof insidePanel) =>
    locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.color];
    });

  expect(await colors(insidePanel)).toEqual([
    tokenColor("color.action.background", "dark"),
    tokenColor("color.action.text", "dark"),
  ]);
  await chooseInMenu(page, panelTrigger(page, "Button examples"), "Light");

  await expect(main.getByRole("group", { name: "Button examples" })).toHaveAttribute(
    "data-theme",
    "light",
  );
  // Polled: the button's color transition is still running right after the switch.
  await expect
    .poll(() => colors(insidePanel))
    .toEqual([
      tokenColor("color.action.background", "light"),
      tokenColor("color.action.text", "light"),
    ]);
  expect(await colors(outsidePanel)).toEqual([
    tokenColor("color.action.background", "dark"),
    tokenColor("color.action.text", "dark"),
  ]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
