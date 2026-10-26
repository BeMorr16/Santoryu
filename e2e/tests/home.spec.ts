import { expect, test, type Page } from "@playwright/test";
import { homeContent } from "../../web/src/content/home.ts";
import { main, storeTheme, tabKey, themes, tokenColor } from "./support.ts";

const designSystemCard = (page: Page) =>
  main(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: "Design System" }) });

const backgroundOf = (page: Page) =>
  designSystemCard(page).evaluate((card) => getComputedStyle(card).backgroundColor);

test("tabs LinkedIn, then the Design System card, then leaves main (home R8.3)", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await main(page).focus();

  await page.keyboard.press(tabKey(browserName));
  await expect(main(page).getByRole("link", { name: homeContent.linkedinLabel })).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  await expect(main(page).getByRole("link", { name: "Design System" })).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  expect(await main(page).evaluate((element) => element.contains(document.activeElement))).toBe(
    false,
  );
});

test.describe("glass cards (decision 0017)", () => {
  for (const theme of themes) {
    test(`are translucent in ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.goto("/");

      expect(await backgroundOf(page)).toMatch(/^rgba\(255, 255, 255, 0\.\d+\)$/);
    });
  }

  test("are opaque in a custom theme", async ({ page }) => {
    await page.addInitScript(() => {
      const theme = { id: "glass000", name: "Glass", scheme: "dark", vars: {}, source: {} };
      localStorage.setItem("custom-themes", JSON.stringify({ v: 1, themes: [theme] }));
      localStorage.setItem("theme", "custom:glass000");
    });
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", "glass000");
    expect(await backgroundOf(page)).toBe(tokenColor("color.surface.raised", "dark"));
  });
});
