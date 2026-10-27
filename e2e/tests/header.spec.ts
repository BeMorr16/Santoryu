import { expect, test, type Locator, type Page } from "@playwright/test";
import { chooseInMenu, gotoSettled, tabKey, tokenColor } from "./support.ts";

const bar = (page: Page) => page.getByRole("banner");
const home = (page: Page) => bar(page).getByRole("link", { name: "BM, Ben Morrison, home" });
const menuButton = (page: Page) => bar(page).getByRole("button", { name: "Menu" });
const designSystem = (page: Page) => bar(page).getByRole("link", { name: "Design System" });
const linkedin = (page: Page) => bar(page).getByRole("link", { name: "LinkedIn" });
const theme = (page: Page) => bar(page).getByRole("button", { name: /^Theme: / });
const contact = (page: Page) => bar(page).getByRole("link", { name: "Contact" });
const pauseBackdrop = (page: Page) =>
  bar(page).getByRole("button", { name: "Pause background animation" });

async function panel(page: Page) {
  return page.locator(`[id="${(await menuButton(page).getAttribute("aria-controls")) ?? ""}"]`);
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe("at 1280×800 (site-refresh R6)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("floats inset from the top, about 80% of the width, with everything in one row", async ({
    page,
  }) => {
    await page.goto("/");
    const box = await bar(page).boundingBox();
    if (!box) throw new Error("no bar");
    const width = await page.evaluate(() => document.documentElement.clientWidth);

    expect(box.y).toBeGreaterThan(0);
    expect(Math.abs(box.width / width - 0.8)).toBeLessThanOrEqual(0.02);
    await expect(menuButton(page)).toBeHidden();
    const centers: number[] = [];
    for (const control of [home, designSystem, contact, linkedin, theme]) {
      await expect(control(page)).toBeVisible();
      const controlBox = await control(page).boundingBox();
      if (!controlBox) throw new Error("no control box");
      centers.push(controlBox.y + controlBox.height / 2);
    }
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(2);
  });

  test("tabs BM, Design System, Contact, the backdrop's pause toggle, LinkedIn, then Theme on Home (R9.2, site-backdrop R6.7, contact R3.5)", async ({
    page,
    browserName,
  }) => {
    await gotoSettled(page, "/");

    await page.keyboard.press(tabKey(browserName));
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    for (const control of [home, designSystem, contact, pauseBackdrop, linkedin, theme]) {
      await page.keyboard.press(tabKey(browserName));
      await expect(control(page)).toBeFocused();
    }
  });

  test("frames the current page's link in gold, and no other link (R6.4, contact R3.2)", async ({
    page,
  }) => {
    const before = (link: (page: Page) => Locator) =>
      link(page).evaluate((element) => {
        const style = getComputedStyle(element, "::before");
        return { content: style.content, width: style.borderTopWidth, color: style.borderTopColor };
      });
    const gold = {
      content: '""',
      width: "3px",
      color: tokenColor("color.action.background", "light"),
    };

    await page.goto("/design-system");
    expect(await before(designSystem)).toEqual(gold);
    expect((await before(contact)).content).toBe("none");

    await page.goto("/contact");
    expect(await before(contact)).toEqual(gold);
    expect((await before(designSystem)).content).toBe("none");

    await page.goto("/");
    expect((await before(designSystem)).content).toBe("none");
    expect((await before(contact)).content).toBe("none");
  });
});

test.describe("at 375×740 (site-refresh R8)", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test.beforeEach(async ({ page }) => {
    // The panel fades in and out; under reduced motion that takes 0ms.
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("shows only BM and Menu until Menu opens the panel", async ({ page }) => {
    await gotoSettled(page, "/");
    await expect(home(page)).toBeVisible();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
    for (const control of [designSystem, contact, linkedin, theme]) {
      await expect(control(page)).toBeHidden();
    }

    await menuButton(page).click();

    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
    for (const control of [designSystem, contact, linkedin, theme]) {
      await expect(control(page)).toBeVisible();
    }
    const barBottom = (await bar(page).boundingBox())?.y ?? 0;
    const panelTop = (await (await panel(page)).boundingBox())?.y ?? 0;
    expect(panelTop).toBeGreaterThan(barBottom);
  });

  test("closes on Escape and returns focus to Menu (R8.3)", async ({ page, browserName }) => {
    await gotoSettled(page, "/");
    // From the keyboard: WebKit, like Safari, doesn't focus a button on a click.
    await menuButton(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tabKey(browserName));
    await expect(designSystem(page)).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(await panel(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("closes when a link in it is followed (R8.3)", async ({ page }) => {
    await gotoSettled(page, "/");
    await menuButton(page).click();

    await designSystem(page).click();

    await expect(page).toHaveURL(/\/design-system$/);
    await expect(await panel(page)).toBeHidden();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps the panel open while the theme menu opens and applies a theme inside it", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await gotoSettled(page, "/");
    await menuButton(page).click();

    await chooseInMenu(page, theme(page), "Dark");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(await panel(page)).toBeVisible();
    await expect(theme(page)).toBeFocused();
  });
});

test.describe("at 320×640 (site-refresh R9.5)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("never scrolls sideways, with the panel closed or open", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-system");
    expect(await noHorizontalScroll(page)).toBe(true);

    await menuButton(page).click();
    await expect(contact(page)).toBeVisible();

    expect(await noHorizontalScroll(page)).toBe(true);
    const box = await (await panel(page)).boundingBox();
    expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(box?.x).toBeGreaterThanOrEqual(0);
  });
});
