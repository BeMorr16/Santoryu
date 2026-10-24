import { expect, test, type Page } from "@playwright/test";
import { componentsPath, designSystemPath } from "../../web/src/design-system/components/pages.ts";
import { main, storeTheme, tabKey, tokenColor } from "./support.ts";

const cards = (page: Page) => main(page).getByRole("listitem");

test.describe("Design System hub (ds-hub R5.3)", () => {
  test("stops once per card in main, on its link (R2.3, R3.5)", async ({ page, browserName }) => {
    await page.goto(designSystemPath);

    const stops: string[] = [];
    for (let press = 0; press < 40; press++) {
      await page.keyboard.press(tabKey(browserName));
      const inMain = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused?.closest("main") ? `${focused.tagName} ${focused.textContent}` : null;
      });
      if (inMain !== null) stops.push(inMain);
      else if (stops.length > 0) break;
    }

    expect(stops).toEqual(["A Tokens", "A Components", "A Theme Creator"]);
  });

  test("follows the card's link when its preview is clicked (R2.2)", async ({ page }) => {
    await page.goto(designSystemPath);
    const preview = cards(page).nth(1).locator("[inert]");
    const box = await preview.boundingBox();
    if (!box) throw new Error("no preview box");

    // The link's overlay is the hit target, so click the point, not the inert preview itself.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page).toHaveURL(componentsPath);
  });

  test("fits 320px in one column, with no horizontal scroll (R1.6)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(designSystemPath);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const xs = await cards(page).evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().x),
    );
    expect(new Set(xs).size).toBe(1);
  });

  test("shows the three cards in one row where they fit (R1.6)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1024 });
    await page.goto(designSystemPath);

    const ys = await cards(page).evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().y),
    );
    expect(ys).toHaveLength(3);
    expect(new Set(ys).size).toBe(1);
  });

  test("keeps the Light panel light while the site is dark (R3.3)", async ({ page }) => {
    await storeTheme(page, "dark");
    await page.goto(designSystemPath);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // High contrast is light-based too (site-refresh amendment), so the Light panel is picked by name.
    const light = main(page)
      .locator('[inert] [data-theme="light"]')
      .filter({ hasText: /^Light/ });
    await expect(light).toHaveCSS("background-color", tokenColor("color.surface.base", "light"));
  });
});
