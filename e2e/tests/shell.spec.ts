import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoSettled, tabKey, tokenColor } from "./support.ts";

const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });
const home = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: "BM, Ben Morrison, home" });
const footer = (page: Page) => page.getByRole("contentinfo");
/** The footer's first column: the first item of its top row (site-footer design §4). */
const personal = (page: Page) => footer(page).locator(":scope > div:first-child > :first-child");
const footerNav = (page: Page) => footer(page).getByRole("navigation", { name: "Footer" });
const builtWith = (page: Page) => footer(page).getByText(/^Built with React \d+ and Vite$/);
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error("not rendered");
  return result;
}

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

test.describe("with the bar grown by 200% text, 320px wide (refinement R11.3)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("keeps every focused element clear of the header, both ways", async ({
    page,
    browserName,
  }) => {
    test.slow();
    await page.goto(componentPath("button"));
    const header = page.getByRole("banner");
    const heightOf = () => header.evaluate((element) => element.getBoundingClientRect().height);
    const before = await heightOf();
    // Through the CSSOM, which the CSP allows.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect.poll(heightOf).toBeGreaterThan(before);
    const height = await heightOf();
    // The bar's top inset (space.stack.sm, 0.5rem = 16px at 200%), its height, then the focus ring.
    await expect
      .poll(async () => Number.parseFloat(await rootStyle(page, "scroll-padding-top")))
      .toBeCloseTo(16 + height + 4, 0);

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
          atEnd: focused.closest('[aria-label="Previous and next"]') !== null,
        };
      });
    const covered: string[] = [];
    let steps = 0;
    for (; steps < 300; steps++) {
      await page.keyboard.press(tabKey(browserName));
      const result = await check();
      if (result === null) continue;
      if (result.atEnd) break;
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

test.describe("the nav's Experience link (resume R2.2)", () => {
  test('is aria-current="page" on /experience, framed by brackets rather than underlined, and BM is not marked', async ({
    page,
  }) => {
    await page.goto("/experience");
    const experience = nav(page).getByRole("link", { name: "Experience" });

    await expect(experience).toHaveAttribute("aria-current", "page");
    await expect(experience).toHaveCSS("text-decoration-line", "none");
    expect(
      await experience.evaluate((element) => getComputedStyle(element, "::before").content),
    ).toBe('""');
    await expect(home(page)).not.toHaveAttribute("aria-current");
  });

  test("is not marked on the home page, where BM is", async ({ page }) => {
    await page.goto("/");

    await expect(nav(page).getByRole("link", { name: "Experience" })).not.toHaveAttribute(
      "aria-current",
    );
    await expect(home(page)).toHaveAttribute("aria-current", "page");
  });
});

test.describe("the nav's Contact link (contact R3.2, R3.3)", () => {
  test('is aria-current="page" on /contact, framed by brackets rather than underlined, and BM is not marked', async ({
    page,
  }) => {
    await page.goto("/contact");
    const contact = nav(page).getByRole("link", { name: "Contact" });

    await expect(contact).toHaveAttribute("aria-current", "page");
    await expect(contact).toHaveCSS("text-decoration-line", "none");
    expect(await contact.evaluate((element) => getComputedStyle(element, "::before").content)).toBe(
      '""',
    );
    await expect(home(page)).not.toHaveAttribute("aria-current");
  });

  test("is not marked on the home page, where BM is", async ({ page }) => {
    await page.goto("/");

    await expect(nav(page).getByRole("link", { name: "Contact" })).not.toHaveAttribute(
      "aria-current",
    );
    await expect(home(page)).toHaveAttribute("aria-current", "page");
  });
});

test.describe("the footer at 1280×800 (site-footer R5.1–R5.3)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("draws one border.rule line above it and none inside it", async ({ page }) => {
    await page.goto("/experience");

    // The tokens as the browser resolves them, through a probe styled with the CSSOM.
    const expected = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.borderTop = "var(--effect-border-width) solid var(--color-border-rule)";
      document.body.append(probe);
      const { borderTopColor, borderTopWidth } = getComputedStyle(probe);
      probe.remove();
      return { borderTopColor, borderTopWidth };
    });
    await expect(footer(page)).toHaveCSS("border-top-style", "solid");
    await expect(footer(page)).toHaveCSS("border-top-color", expected.borderTopColor);
    await expect(footer(page)).toHaveCSS("border-top-width", expected.borderTopWidth);

    const bordered = await footer(page).evaluate((element) =>
      [...element.querySelectorAll("*")]
        .filter((descendant) => {
          const style = getComputedStyle(descendant);
          const transparent = /^rgba\(.*, 0\)$|^transparent$/.test(style.borderTopColor);
          return (
            style.borderTopStyle !== "none" &&
            Number.parseFloat(style.borderTopWidth) > 0 &&
            !transparent
          );
        })
        .map((descendant) => descendant.outerHTML.slice(0, 80)),
    );
    expect(bordered).toEqual([]);
  });

  test("spans the line across the inset, and sets the columns space.inline.lg in from its ends", async ({
    page,
  }) => {
    await page.goto("/experience");

    const { rem, viewport } = await page.evaluate(() => ({
      rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      viewport: document.documentElement.clientWidth,
    }));
    const column = await box(personal(page));
    const nav = await box(footerNav(page));
    const line = await box(footer(page));
    // The rule's inset (2.5rem), then the content's padding inside it (space.inline.lg, 1.5rem).
    expect(line.x).toBeCloseTo(2.5 * rem, 0);
    expect(viewport - (line.x + line.width)).toBeCloseTo(2.5 * rem, 0);
    expect(column.x).toBeCloseTo(4 * rem, 0);
    expect(viewport - (nav.x + nav.width)).toBeCloseTo(4 * rem, 0);
    expect(column.x + column.width).toBeLessThanOrEqual(nav.x);
    expect((await box(builtWith(page))).x).toBeCloseTo(4 * rem, 0);
  });
});

test.describe("the footer at 768px (site-footer R5.3)", () => {
  test.use({ viewport: { width: 768, height: 800 } });

  test("keeps the two columns side by side", async ({ page }) => {
    await page.goto("/experience");

    const column = await box(personal(page));
    const nav = await box(footerNav(page));
    expect(column.x + column.width).toBeLessThanOrEqual(nav.x);
    expect(nav.y).toBeCloseTo(column.y, 0);
  });

  test("never scrolls sideways with 200% text (R6.4)", async ({ page }) => {
    await gotoSettled(page, "/experience");
    const heightOf = () => footer(page).evaluate((element) => element.clientHeight);
    const before = await heightOf();
    // Through the CSSOM, which the CSP allows.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect.poll(heightOf).toBeGreaterThan(before);

    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

test.describe("the footer at 375px (site-footer R5.4)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("stacks the personal column, nav, then the built-with note", async ({ page }) => {
    await page.goto("/experience");

    const parts = [personal(page), footerNav(page), builtWith(page)];
    const boxes = await Promise.all(parts.map(box));
    boxes.slice(1).forEach((later, index) => {
      const earlier = boxes[index];
      expect(later.y).toBeGreaterThanOrEqual((earlier?.y ?? 0) + (earlier?.height ?? 0) - 0.5);
    });
  });
});

test.describe("the footer at 320px (site-footer R6.4)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("never scrolls sideways", async ({ page }) => {
    await page.goto("/experience");

    await expect(footer(page)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

test("keeps the footer's line in forced colors (site-footer R6.5)", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/experience");

  const line = await footer(page).evaluate((element) => {
    const { borderTopStyle, borderTopWidth, borderTopColor } = getComputedStyle(element);
    return { borderTopStyle, borderTopWidth, borderTopColor };
  });
  expect(line.borderTopStyle).not.toBe("none");
  expect(Number.parseFloat(line.borderTopWidth)).toBeGreaterThan(0);
  expect(line.borderTopColor).not.toMatch(/^rgba\(.*, 0\)$|^transparent$/);
});
