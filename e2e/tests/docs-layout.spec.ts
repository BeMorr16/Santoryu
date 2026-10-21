import { expect, test, type Page } from "@playwright/test";
import { componentPath, componentsPath } from "../../web/src/design-system/components/pages.ts";
import { tabKey } from "./support.ts";

const sideMenu = (page: Page) => page.getByRole("navigation", { name: "Components" });
const toggle = (page: Page) => sideMenu(page).getByRole("button", { name: /^Components/ });
const box = async (page: Page, selector: Parameters<Page["locator"]>[0]) => {
  const rect = await page.locator(selector).first().boundingBox();
  if (!rect) throw new Error(`${selector} has no box`);
  return rect;
};
const headerBottom = (page: Page) =>
  page.getByRole("banner").evaluate((element) => element.getBoundingClientRect().bottom);
const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1280, 800]) {
  test.describe(`at ${String(width)}px wide (R2.4)`, () => {
    test.use({ viewport: { width, height: 720 } });

    test("shows the side menu as a column at the inline start of main, with no toggle", async ({
      page,
    }) => {
      await page.goto(componentPath("button"));

      await expect(toggle(page)).toBeHidden();
      await expect(sideMenu(page).getByRole("link", { name: "Overview" })).toBeVisible();
      const menu = await box(page, 'nav[aria-label="Components"]');
      const main = await box(page, "main");
      expect(menu.x + menu.width).toBeLessThanOrEqual(main.x + 1);
      expect(Math.abs(menu.y - main.y)).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("at 1280×720", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("keeps the side menu below the header while the page scrolls (R2.4)", async ({ page }) => {
    await page.goto(componentPath("table"));
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);

    const top = (await box(page, 'nav[aria-label="Components"]')).y;
    expect(Math.abs(top - (await headerBottom(page)))).toBeLessThanOrEqual(1);
  });

  test("shows On this page as a sticky rail at the inline end of the content (R4.2)", async ({
    page,
  }) => {
    await page.goto(componentPath("button"));
    const toc = page.getByRole("list", { name: "On this page" }).locator("..");
    const tocBox = await toc.boundingBox();
    const heading = await box(page, "h2#examples");
    if (!tocBox) throw new Error("no On this page box");
    expect(tocBox.x).toBeGreaterThanOrEqual(heading.x + heading.width);

    await page.mouse.wheel(0, 2500);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1500);
    const scrolled = await toc.boundingBox();
    expect(scrolled?.y).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
    expect(scrolled?.y).toBeLessThan(720);
  });

  test("an On this page link puts its heading below the sticky header (R4.3)", async ({ page }) => {
    await page.goto(componentPath("button"));

    await page
      .getByRole("list", { name: "On this page" })
      .getByRole("link", { name: "Props" })
      .click();

    await expect(page).toHaveURL(/#props$/);
    const heading = page.locator("h2#props");
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())?.y).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
  });

  test("previous and next go through the pages in side-menu order, focusing each h1 (R4.9, R2.6)", async ({
    page,
  }) => {
    await page.goto(componentsPath);
    const prevNext = () => page.getByRole("list", { name: "Previous and next" });

    await prevNext().getByRole("link", { name: "Next: Button" }).click();
    await expect(page).toHaveURL(new RegExp(`${componentPath("button")}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Button" })).toBeFocused();

    await prevNext().getByRole("link", { name: "Next: Link" }).click();
    await expect(page).toHaveURL(new RegExp(`${componentPath("link")}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Link" })).toBeFocused();

    await prevNext().getByRole("link", { name: "Previous: Button" }).click();
    await expect(page).toHaveURL(new RegExp(`${componentPath("button")}$`));
  });

  test("a side menu link navigates client-side and marks its page (R2.3, R2.6)", async ({
    page,
  }) => {
    await page.goto(componentPath("button"));

    await sideMenu(page).getByRole("link", { name: "Tooltip" }).click();

    await expect(page).toHaveURL(new RegExp(`${componentPath("tooltip")}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Tooltip" })).toBeFocused();
    await expect(sideMenu(page).getByRole("link", { name: "Tooltip" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sideMenu(page).getByRole("link", { name: "Button" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

test.describe("at 1000px wide", () => {
  test.use({ viewport: { width: 1000, height: 720 } });

  test("puts On this page in the flow, after the source link and before the content (R4.2)", async ({
    page,
  }) => {
    await page.goto(componentPath("button"));
    const source = await box(page, 'a:text("View source on GitHub")');
    const toc = page.getByRole("list", { name: "On this page" });
    const tocBox = await toc.boundingBox();
    const heading = await box(page, "h2#examples");
    if (!tocBox) throw new Error("no On this page box");

    expect(tocBox.y).toBeGreaterThan(source.y);
    expect(tocBox.y).toBeLessThan(heading.y);
    expect(tocBox.x).toBeLessThan(heading.x + heading.width / 2);
  });
});

test.describe("on a short window", () => {
  test.use({ viewport: { width: 1280, height: 560 } });

  test("scrolls the side menu on its own when it's taller than the space below the header (R2.4)", async ({
    page,
  }) => {
    await page.goto(componentPath("button"));
    // Hydrated: the shell has measured the header, which the menu's height subtracts.
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue("--shell-header-block-size"),
        ),
      )
      .not.toBe("");
    const menu = sideMenu(page);

    const overflow = await menu.evaluate((element) => ({
      scrolls: element.scrollHeight > element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      bottom: element.getBoundingClientRect().bottom,
    }));
    expect(overflow.scrolls).toBe(true);
    expect(overflow.overflowY).toBe("auto");
    expect(overflow.bottom).toBeLessThanOrEqual(560 + 1);

    await menu.getByRole("link", { name: "ThemeSwitcher" }).focus();
    await expect(menu.getByRole("link", { name: "ThemeSwitcher" })).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});

test.describe("at 375px wide (R2.5)", () => {
  test.use({ viewport: { width: 375, height: 720 } });

  test("shows a collapsed Components disclosure above the content", async ({ page }) => {
    await page.goto(componentPath("button"));

    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(sideMenu(page).getByRole("link", { name: "Overview" })).toBeHidden();
    expect((await box(page, 'nav[aria-label="Components"]')).y).toBeLessThan(
      (await box(page, "main")).y,
    );
  });

  for (const key of ["Enter", "Space"]) {
    test(`opens with ${key}, pushing the content down, and a link navigates, focuses the h1 and collapses it again`, async ({
      page,
    }) => {
      await page.goto(componentPath("button"));
      const before = (await box(page, "main")).y;

      await toggle(page).focus();
      await page.keyboard.press(key);

      await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
      const link = sideMenu(page).getByRole("link", { name: "Card" });
      await expect(link).toBeVisible();
      expect((await box(page, "main")).y).toBeGreaterThan(before);

      await link.click();
      await expect(page).toHaveURL(new RegExp(`${componentPath("card")}$`));
      await expect(page.getByRole("heading", { level: 1, name: "Card" })).toBeFocused();
      await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
      await expect(sideMenu(page).getByRole("link", { name: "Overview" })).toBeHidden();
    });
  }

  test("closes again with a second press", async ({ page, browserName }) => {
    await page.goto(componentPath("button"));
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");

    await toggle(page).click();

    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(sideMenu(page).getByRole("link", { name: "Overview" })).toBeHidden();
    // A closed list holds no Tab stops: the next one is in main.
    await page.keyboard.press(tabKey(browserName));
    expect(await page.evaluate(() => document.activeElement?.closest("main") !== null)).toBe(true);
  });
});

test.describe("without JavaScript, at 375px wide (R2.5)", () => {
  test.use({ viewport: { width: 375, height: 720 }, javaScriptEnabled: false });

  test("shows the lists expanded and hides the toggle", async ({ page }) => {
    await page.goto(componentPath("button"));

    await expect(sideMenu(page).getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(sideMenu(page).getByRole("link", { name: "ThemeSwitcher" })).toBeVisible();
    await expect(toggle(page)).toBeHidden();
  });
});

test.describe("reflow (R2.7)", () => {
  for (const [label, width, fontSize] of [
    ["320px wide", 320, ""],
    // WCAG 1.4.10 (320px) and 1.4.4 (200% text) are separate conditions; both at once is about
    // 800% zoom, past either.
    ["800px wide at 200% text", 800, "200%"],
    ["1280px wide at 200% text", 1280, "200%"],
  ] as const) {
    test(`no docs page scrolls sideways at ${label}`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width, height: 720 });
      for (const path of [
        componentsPath,
        componentPath("button"),
        componentPath("table"),
        componentPath("code-block"),
        componentPath("menu"),
      ]) {
        await page.goto(path);
        if (fontSize) {
          // Through the CSSOM, which the CSP allows.
          await page.evaluate((size) => {
            document.documentElement.style.fontSize = size;
          }, fontSize);
        }
        if (width < 768) await toggle(page).click();
        expect(await sideways(page), path).toBeLessThanOrEqual(0);
      }
    });
  }
});
