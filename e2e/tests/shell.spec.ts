import { expect, test, type Page } from "@playwright/test";
import { gotoSettled, tabKey, tokenColor } from "./support.ts";

const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });
const home = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: "BM, Ben Morrison, home" });
const rootStyle = (page: Page, property: string) =>
  page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name),
    property,
  );

test("focuses the new page's h1 after navigation, with a ring after the keyboard (refinement R11.1, R11.2)", async ({
  page,
}) => {
  await gotoSettled(page, "/");

  await nav(page).getByRole("link", { name: "Design System" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/design-system$/);
  const heading = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(heading).toBeFocused();
  expect(await heading.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(heading).toHaveCSS("outline-style", "solid");
  await expect(heading).toHaveCSS("outline-width", "2px");
  await expect(heading).toBeInViewport();
  const headerBottom = await page
    .getByRole("banner")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  expect((await heading.boundingBox())?.y).toBeGreaterThanOrEqual(headerBottom);

  await home(page).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeFocused();
});

test.describe("at 320×256, as at 400% zoom (refinement R11.4)", () => {
  test.use({ viewport: { width: 320, height: 256 } });

  test("puts the header in the page flow, with no scroll padding", async ({ page }) => {
    await page.goto("/design-system");

    // Relative rather than static: still in the flow, and the containing block of its brackets.
    await expect(page.getByRole("banner")).toHaveCSS("position", "relative");
    expect(await rootStyle(page, "scroll-padding-top")).toBe("0px");
  });
});

test.describe("at 320×640", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("keeps the header sticky (refinement R11.4)", async ({ page }) => {
    await page.goto("/design-system");

    await expect(page.getByRole("banner")).toHaveCSS("position", "sticky");
  });
});

test.describe("at 1280×1024", () => {
  test.use({ viewport: { width: 1280, height: 1024 } });

  test("puts the footer at the bottom of a short page (refinement R11.10)", async ({ page }) => {
    await page.goto("/nope");

    const bottom = await page
      .getByRole("contentinfo")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    expect(bottom).toBeCloseTo(1024, 0);
  });
});

test("moves focus into main from the skip link, clear of the header (R3.3)", async ({
  page,
  browserName,
}) => {
  await page.goto("/design-system");

  await page.keyboard.press(tabKey(browserName));
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press(tabKey(browserName));
  const next = page.locator(":focus");
  expect(await next.evaluate((element) => element.closest("main") !== null)).toBe(true);
  const headerBottom = await page
    .getByRole("banner")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  expect((await next.boundingBox())?.y).toBeGreaterThanOrEqual(headerBottom);
});

test("keeps BM text-colored and never underlined, on hover or as the current page (refinement R11.8, site-refresh R7.1)", async ({
  page,
}) => {
  const text = tokenColor("color.text.default", "light");
  for (const path of ["/design-system", "/"]) {
    await page.goto(path);
    const name = home(page);

    await expect(name).toHaveCSS("text-decoration-line", "none");
    await expect(name).toHaveCSS("color", text);
    await name.hover();
    await expect(name).toHaveCSS("text-decoration-line", "none");
    await expect(name).toHaveCSS("color", text);
  }
});

test("never underlines the nav's links, and recolors one on hover (site-refresh, owner's review)", async ({
  page,
}) => {
  await gotoSettled(page, "/");
  const designSystem = nav(page).getByRole("link", { name: "Design System" });

  await expect(designSystem).toHaveCSS("text-decoration-line", "none");
  await designSystem.hover();
  await expect(designSystem).toHaveCSS("text-decoration-line", "none");
  await expect(designSystem).toHaveCSS("color", tokenColor("color.link.hover", "light"));
});

test.describe("the nav's Design System link (ds-components R1.6)", () => {
  for (const [path, current] of [
    ["/design-system", "page"],
    ["/design-system/tokens", "true"],
    ["/design-system/components", "true"],
    ["/design-system/components/button", "true"],
  ] as const) {
    test(`is aria-current="${current}" on ${path}, framed by brackets rather than underlined, and BM is not marked`, async ({
      page,
    }) => {
      await page.goto(path);
      const designSystem = nav(page).getByRole("link", { name: "Design System" });

      await expect(designSystem).toHaveAttribute("aria-current", current);
      await expect(designSystem).toHaveCSS("text-decoration-line", "none");
      expect(
        await designSystem.evaluate((element) => getComputedStyle(element, "::before").content),
      ).toBe('""');
      await expect(home(page)).not.toHaveAttribute("aria-current");
    });
  }

  test("is not marked on the home page, where BM is", async ({ page }) => {
    await page.goto("/");

    await expect(nav(page).getByRole("link", { name: "Design System" })).not.toHaveAttribute(
      "aria-current",
    );
    await expect(home(page)).toHaveAttribute("aria-current", "page");
  });
});
