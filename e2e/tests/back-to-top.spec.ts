import { expect, test, type Page } from "@playwright/test";
import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { tabKey } from "./support.ts";

/** The site's own Back to top button: the one after the footer, outside main. */
const backToTop = (page: Page) =>
  page.locator("body > div > button").filter({ hasText: "Back to top" });
const longPage = componentPath("table");

async function scrollPage(page: Page, y: number) {
  await page.evaluate((top) => {
    scrollTo({ top, behavior: "instant" });
  }, y);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(y);
}

test.describe("at 1280×720", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("is hidden at the top, out of sight, the tab order and the accessibility tree (R5.3)", async ({
    page,
    browserName,
  }) => {
    await page.goto(longPage);

    await expect(backToTop(page)).toHaveCSS("visibility", "hidden");
    await expect(page.getByRole("button", { name: "Back to top" })).toHaveCount(0);
    // Starts Tab from the footer without scrolling to it: a click would scroll the page past one
    // viewport and show the button.
    await page
      .getByRole("contentinfo")
      .getByText(/©/)
      .evaluate((element) => {
        if (!(element instanceof HTMLElement)) throw new Error("no footer text");
        element.tabIndex = -1;
        element.focus({ preventScroll: true });
      });
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.keyboard.press(tabKey(browserName));
    await expect(backToTop(page)).not.toBeFocused();
  });

  test("shows in the corner once scrolled past one viewport, and hides again above it (R5.3)", async ({
    page,
  }) => {
    await page.goto(longPage);

    await scrollPage(page, 720);
    await expect(backToTop(page)).toHaveCSS("visibility", "hidden");
    await scrollPage(page, 800);
    await expect(backToTop(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to top" })).toHaveCount(1);
    const box = await backToTop(page).boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(1280 - 64);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(720 - 64);

    await scrollPage(page, 100);
    await expect(backToTop(page)).toHaveCSS("visibility", "hidden");
  });

  test("names itself in a tooltip on keyboard focus (R5.4)", async ({ page, browserName }) => {
    await page.goto(longPage);
    await scrollPage(page, 2000);
    await expect(backToTop(page)).toBeVisible();

    await page.getByRole("contentinfo").getByText(/©/).click();
    await page.keyboard.press(tabKey(browserName));

    await expect(backToTop(page)).toBeFocused();
    // A name tooltip repeats the name, so it's hidden from assistive technology (refinement R14.12).
    const tooltip = backToTop(page).locator("xpath=following-sibling::span[@popover][1]");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("Back to top");
  });

  test("never shows on a page too short to pass the threshold (R5.3)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    });

    await expect(backToTop(page)).toHaveCSS("visibility", "hidden");
  });

  test("keeps focused elements from being fully covered while shown (R5.6)", async ({
    page,
    browserName,
  }) => {
    await page.goto(longPage);
    await scrollPage(page, 2000);
    await expect(backToTop(page)).toBeVisible();
    await page.locator("h2#props").click();

    const covered: string[] = [];
    for (let step = 0; step < 40; step++) {
      await page.keyboard.press(tabKey(browserName));
      const result = await page.evaluate(() => {
        const focused = document.activeElement;
        const button = [...document.querySelectorAll("body > div > button")].at(-1);
        if (!(focused instanceof HTMLElement) || !button || focused === button) return null;
        const a = focused.getBoundingClientRect();
        const b = button.getBoundingClientRect();
        const inside =
          a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;
        return inside ? `${focused.tagName} ${focused.textContent.trim().slice(0, 30)}` : "";
      });
      if (result) covered.push(result);
    }
    expect(covered).toEqual([]);
  });

  for (const fontSize of ["", "200%"]) {
    test(`covers no text or control at the bottom of the page${fontSize ? " at 200% text" : ""} (R5.6)`, async ({
      page,
    }) => {
      await page.goto(longPage);
      if (fontSize) {
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, fontSize);
      }
      await page.evaluate(() => {
        scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      });
      await expect(backToTop(page)).toBeVisible();
      // Settled: the slide-in has finished.
      await expect(backToTop(page)).toHaveCSS("opacity", "1");

      const overlaps = await page.evaluate(() => {
        const button = [...document.querySelectorAll("body > div > button")].at(-1);
        if (!button) return ["no button"];
        const b = button.getBoundingClientRect();
        const hits = (r: DOMRect) =>
          r.width > 0 &&
          r.height > 0 &&
          r.left < b.right &&
          r.right > b.left &&
          r.top < b.bottom &&
          r.bottom > b.top;
        const found: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          // Its own label and closed tooltips (which have no boxes) aside.
          const own = button.contains(node) || node.parentElement?.closest("[popover]");
          if (!node.textContent?.trim() || own) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some(hits))
            found.push(`text: ${node.textContent.trim().slice(0, 30)}`);
        }
        for (const control of document.querySelectorAll("a, button, input, select, textarea")) {
          if (control === button || control.closest("[popover]")) continue;
          if (hits(control.getBoundingClientRect()))
            found.push(`control: ${control.textContent.trim().slice(0, 30)}`);
        }
        return found;
      });
      expect(overlaps).toEqual([]);
    });
  }
});

test.describe("activation (R5.5)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("with reduced motion, jumps to the top and focuses the h1 without scrolling again", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(longPage);
    await scrollPage(page, 3000);

    await backToTop(page).click();

    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.getByRole("heading", { level: 1, name: "Table" })).toBeFocused();
  });

  test("with no motion preference, scrolls smoothly to the top and focuses the h1", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(longPage);
    await scrollPage(page, 3000);

    await backToTop(page).click();

    await expect(page.getByRole("heading", { level: 1, name: "Table" })).toBeFocused();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });

  for (const key of ["Enter", "Space"]) {
    test(`works with ${key}, so the next Tab continues from the top`, async ({
      page,
      browserName,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(longPage);
      await scrollPage(page, 3000);
      // Shown once scripts run; focus() doesn't wait for that, as click() does.
      await expect(backToTop(page)).toBeVisible();
      await backToTop(page).focus();
      await expect(backToTop(page)).toBeFocused();

      await page.keyboard.press(key);

      await expect(page.getByRole("heading", { level: 1, name: "Table" })).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await page.keyboard.press(tabKey(browserName));
      expect(
        await page.evaluate(
          () => document.activeElement?.closest("main") !== null && scrollY < innerHeight,
        ),
      ).toBe(true);
    });
  }

  test("animates showing with motion tokens, and with no movement under reduced motion (R5.7)", async ({
    page,
  }) => {
    await page.goto(longPage);
    expect(
      await backToTop(page).evaluate((element) => getComputedStyle(element).translate),
    ).not.toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await backToTop(page).evaluate((element) => getComputedStyle(element).translate)).toBe(
      "none",
    );
  });
});

test.describe("below 48em wide (R5.3, owner 2026-10-21)", () => {
  test.use({ viewport: { width: 375, height: 720 } });

  test("never shows, however far the page scrolls", async ({ page }) => {
    await page.goto(longPage);
    await scrollPage(page, 3000);

    await expect(backToTop(page)).toHaveCSS("visibility", "hidden");
  });
});
