import { expect, test, type Page } from "@playwright/test";
import { tabKey, tokenColor } from "./support.ts";

const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });
const rootStyle = (page: Page, property: string) =>
  page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name),
    property,
  );

test("focuses the new page's h1 after navigation, with a ring after the keyboard (refinement R11.1, R11.2)", async ({
  page,
}) => {
  await page.goto("/");

  await nav(page).getByRole("link", { name: "Lab" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lab$/);
  const lab = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(lab).toBeFocused();
  expect(await lab.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(lab).toHaveCSS("outline-style", "solid");
  await expect(lab).toHaveCSS("outline-width", "2px");
  await expect(lab).toBeInViewport();
  const headerBottom = await page
    .getByRole("banner")
    .evaluate((element) => element.getBoundingClientRect().bottom);
  expect((await lab.boundingBox())?.y).toBeGreaterThanOrEqual(headerBottom);

  await nav(page).getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeFocused();
});

test.describe("with the header wrapped at 200% text, 320px wide (refinement R11.3)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("keeps every focused element clear of the header, both ways", async ({
    page,
    browserName,
  }) => {
    test.slow();
    await page.goto("/lab/components");
    // Through the CSSOM, which the CSP allows.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const header = page.getByRole("banner");
    const rows = await header.evaluate(
      (element) =>
        new Set([...element.children].map((child) => Math.round(child.getBoundingClientRect().top)))
          .size,
    );
    expect(rows).toBeGreaterThan(1);
    const height = await header.evaluate((element) => element.getBoundingClientRect().height);
    await expect
      .poll(async () => Number.parseFloat(await rootStyle(page, "scroll-padding-top")))
      .toBeCloseTo(height + 4, 0);

    /**
     * Whether the focused element is clear of the header, or null outside the page content. One
     * taller than the space below the header can't be, so it only has to show (WCAG 2.4.11).
     */
    const check = () =>
      page.evaluate(() => {
        const focused = document.activeElement;
        if (!(focused instanceof HTMLElement) || !focused.closest("main")) return null;
        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        const { top, bottom, height } = focused.getBoundingClientRect();
        const fits = height <= window.innerHeight - headerBottom;
        return {
          label: `${focused.tagName.toLowerCase()} "${(focused.getAttribute("aria-label") ?? focused.textContent).trim().slice(0, 40)}"`,
          clear: fits
            ? top >= headerBottom - 0.5
            : bottom > headerBottom && top < window.innerHeight,
          inLink: focused.closest("#link") !== null,
        };
      });
    const covered: string[] = [];
    let steps = 0;
    for (; steps < 300; steps++) {
      await page.keyboard.press(tabKey(browserName));
      const result = await check();
      if (result === null) continue;
      if (result.inLink) break;
      if (!result.clear) covered.push(`forward: ${result.label}`);
    }
    expect(steps).toBeLessThan(300);
    for (let back = 0; back < steps; back++) {
      await page.keyboard.press(tabKey(browserName, true));
      const result = await check();
      if (result === null) break;
      if (!result.clear) covered.push(`back: ${result.label}`);
    }
    expect(covered).toEqual([]);
  });
});

test.describe("at 320×256, as at 400% zoom (refinement R11.4)", () => {
  test.use({ viewport: { width: 320, height: 256 } });

  test("puts the header in the page flow, with no scroll padding", async ({ page }) => {
    await page.goto("/lab");

    await expect(page.getByRole("banner")).toHaveCSS("position", "static");
    expect(await rootStyle(page, "scroll-padding-top")).toBe("0px");
  });
});

test.describe("at 320×640", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("keeps the header sticky (refinement R11.4)", async ({ page }) => {
    await page.goto("/lab");

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
  await page.goto("/lab");

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

test("keeps the site name text-colored, underlined only on hover (refinement R11.8)", async ({
  page,
}) => {
  await page.goto("/lab");
  const name = page.getByRole("banner").getByRole("link", { name: "Ben" });
  const text = tokenColor("color.text.default", "light");

  await expect(name).toHaveCSS("text-decoration-line", "none");
  await expect(name).toHaveCSS("color", text);
  await name.hover();
  await expect(name).toHaveCSS("text-decoration-line", "underline");
  await expect(name).toHaveCSS("color", text);
});

test("underlines the nav's links on hover, and the current one always (refinement R11.7)", async ({
  page,
}) => {
  await page.goto("/");
  const lab = nav(page).getByRole("link", { name: "Lab" });

  await expect(lab).toHaveCSS("text-decoration-line", "none");
  await lab.hover();
  await expect(lab).toHaveCSS("text-decoration-line", "underline");
  await expect(nav(page).getByRole("link", { name: "Home" })).toHaveCSS(
    "text-decoration-line",
    "underline",
  );
});
