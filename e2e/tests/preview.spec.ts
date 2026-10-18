import { expect, test } from "@playwright/test";
import { chooseInMenu, panelTrigger, section, storeTheme, tokenColor } from "./support.ts";

test("a panel set to Light inside a dark page restyles only itself (R15.6, R15.7)", async ({
  page,
}) => {
  await storeTheme(page, "dark");
  await page.goto("/lab/components");
  const insidePanel = section(page, "Button").getByRole("button", { name: "Primary", exact: true });
  const outsidePanel = section(page, "Link").getByRole("link", { name: "Explore the lab" });
  const colors = (locator: typeof insidePanel) =>
    locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.color];
    });

  expect(await colors(insidePanel)).toEqual([
    tokenColor("color.action.background", "dark"),
    tokenColor("color.action.text", "dark"),
  ]);
  await chooseInMenu(page, panelTrigger(page, "Button"), "Light");

  await expect(
    section(page, "Button").getByRole("group", { name: "Button examples" }),
  ).toHaveAttribute("data-theme", "light");
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
