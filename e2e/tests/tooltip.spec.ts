import { expect, test, type Locator, type Page } from "@playwright/test";
import { example, section, storeTheme, tabKey, themes, tokenColor } from "./support.ts";

const tooltipSection = (page: Page) => section(page, "Tooltip");

/** A button in one of the Tooltip section's examples. */
const trigger = (page: Page, title: string, name: string) =>
  example(tooltipSection(page), title).getByRole("button", { name, exact: true });

/** The tooltip popup that follows a trigger (refinement R14.1). */
const popupOf = (trigger: Locator) => trigger.locator("xpath=following-sibling::span[@popover][1]");

const isOpen = (popup: Locator) => popup.evaluate((element) => element.matches(":popover-open"));

async function expectOpen(popup: Locator, open = true) {
  await expect.poll(() => isOpen(popup)).toBe(open);
}

type Box = { top: number; left: number; bottom: number; right: number };
const rectOf = (locator: Locator): Promise<Box> =>
  locator.evaluate((element) => {
    const { top, left, bottom, right } = element.getBoundingClientRect();
    return { top, left, bottom, right };
  });

/** The arrow's center along the edge it sits on, in viewport coordinates (refinement R14.8). */
const arrowCenter = (popup: Locator) =>
  popup.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const arrow = getComputedStyle(element, "::before");
    const side = element.getAttribute("data-placed");
    return side === "top" || side === "bottom"
      ? box.left + parseFloat(style.borderLeftWidth) + parseFloat(arrow.left)
      : box.top + parseFloat(style.borderTopWidth) + parseFloat(arrow.top);
  });

/** Focuses `target` from the keyboard: back one control, then forward again. */
async function keyboardFocus(page: Page, browserName: string, target: Locator) {
  await target.focus();
  await page.keyboard.press(tabKey(browserName, true));
  await page.keyboard.press(tabKey(browserName));
  await expect(target).toBeFocused();
}

/** Scrolls so `target`'s top edge sits `y` pixels below the viewport's top. */
const scrollTo = (target: Locator, y: number) =>
  target.evaluate((element, y) => {
    window.scrollBy(0, element.getBoundingClientRect().top - y);
  }, y);

const offset = 8; // component.tooltip.offset: space.stack.sm

test.describe("Tooltip (refinement R14)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab/components");
  });

  test("shows after a hover delay, stays while the pointer moves onto it, and hides after leaving (R14.5, R14.6)", async ({
    page,
  }) => {
    const save = trigger(page, "Description", "Save draft");
    const popup = popupOf(save);
    await save.evaluate((element) => {
      element.scrollIntoView({ block: "center" });
    });

    await save.hover();
    expect(await isOpen(popup)).toBe(false);
    await expectOpen(popup);

    // Across the gap onto the popup, within the hide delay.
    const box = await rectOf(popup);
    await page.mouse.move((box.left + box.right) / 2, (box.top + box.bottom) / 2, { steps: 4 });
    await page.waitForTimeout(400);
    expect(await isOpen(popup)).toBe(true);

    await page.mouse.move(0, 0);
    await expectOpen(popup, false);
  });

  test("shows on keyboard focus, not on a mouse press, and Escape hides it with focus kept (R14.5, R14.6)", async ({
    page,
    browserName,
  }) => {
    const save = trigger(page, "Description", "Save draft");
    const popup = popupOf(save);

    await keyboardFocus(page, browserName, save);
    expect(await isOpen(popup)).toBe(true);
    await page.keyboard.press("Escape");
    expect(await isOpen(popup)).toBe(false);
    await expect(save).toBeFocused();

    await page.keyboard.press(tabKey(browserName));
    await save.click();
    await page.waitForTimeout(500);
    expect(await isOpen(popup)).toBe(false);
  });

  test("is in the top layer, above the sticky header (R14.7)", async ({ page, browserName }) => {
    const save = trigger(page, "Description", "Save draft");
    const popup = popupOf(save);
    await keyboardFocus(page, browserName, save);
    const header = await rectOf(page.getByRole("banner"));
    // A little more room above than the popup needs, so it sits where the header is.
    const height = await popup.evaluate((element) => element.getBoundingClientRect().height);
    const y = height + 2 * offset + 6;
    await scrollTo(save, y);
    await expect.poll(async () => Math.abs((await rectOf(save)).top - y)).toBeLessThan(1);
    await expect.poll(() => popup.getAttribute("data-placed")).toBe("top");

    const box = await rectOf(popup);
    expect(box.top).toBeLessThan(header.bottom);
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("[popover]")?.id ?? null,
      { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 },
    );
    expect(hit).toBe(await popup.getAttribute("id"));
  });

  for (const side of ["Top", "Bottom", "Start", "End"] as const) {
    test(`places the ${side.toLowerCase()} tooltip offset from its trigger and centered on it, with the arrow at its center (R14.7, R14.8)`, async ({
      page,
      browserName,
    }) => {
      const button = trigger(page, "Sides", side);
      const popup = popupOf(button);
      await button.evaluate((element) => {
        element.scrollIntoView({ block: "center" });
      });
      await keyboardFocus(page, browserName, button);

      const placed = await popup.getAttribute("data-placed");
      const requested = { Top: "top", Bottom: "bottom", Start: "left", End: "right" }[side];
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[requested];
      // Centered in the viewport, top and bottom always fit; start and end flip if they must.
      if (side === "Top" || side === "Bottom") expect(placed).toBe(requested);
      else expect([requested, opposite]).toContain(placed);

      const t = await rectOf(button);
      const p = await rectOf(popup);
      const gap = {
        top: t.top - p.bottom,
        bottom: p.top - t.bottom,
        left: t.left - p.right,
        right: p.left - t.right,
      }[placed ?? ""];
      expect(gap).toBeCloseTo(offset, 0);
      // Centered on the trigger, unless that would cross a viewport edge: then `offset` inside it.
      const vertical = placed === "top" || placed === "bottom";
      const viewport = page.viewportSize() ?? { width: 0, height: 0 };
      const triggerCenter = vertical ? (t.left + t.right) / 2 : (t.top + t.bottom) / 2;
      const length = vertical ? p.right - p.left : p.bottom - p.top;
      const room = vertical ? viewport.width : viewport.height;
      const start = Math.min(Math.max(triggerCenter - length / 2, offset), room - offset - length);
      expect(Math.abs((vertical ? p.left : p.top) - start)).toBeLessThanOrEqual(1);
      expect(Math.abs((await arrowCenter(popup)) - triggerCenter)).toBeLessThanOrEqual(1);
    });
  }

  test("flips below a trigger at the viewport's top edge, with the arrow following (R14.7, R14.8)", async ({
    page,
    browserName,
  }) => {
    const save = trigger(page, "Description", "Save draft");
    const popup = popupOf(save);
    await keyboardFocus(page, browserName, save);
    await scrollTo(save, 2);

    await expect.poll(() => popup.getAttribute("data-placed")).toBe("bottom");
    const t = await rectOf(save);
    const p = await rectOf(popup);
    expect(p.top - t.bottom).toBeCloseTo(offset, 0);
    expect(Math.abs((await arrowCenter(popup)) - (t.left + t.right) / 2)).toBeLessThanOrEqual(1);
  });

  for (const theme of themes) {
    test(`draws the inverse bubble in ${theme} (R14.9)`, async ({ page, browserName }) => {
      await storeTheme(page, theme);
      await page.goto("/lab/components");
      const save = trigger(page, "Description", "Save draft");
      await keyboardFocus(page, browserName, save);

      const popup = popupOf(save);
      await expect(popup).toHaveCSS("background-color", tokenColor("color.surface.inverse", theme));
      await expect(popup).toHaveCSS("color", tokenColor("color.text.inverse", theme));
      expect(
        await popup.evaluate((element) => getComputedStyle(element, "::before").backgroundColor),
      ).toBe(tokenColor("color.surface.inverse", theme));
    });
  }

  test("outlines the bubble and its arrow under forced colors (R14.10)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const save = trigger(page, "Description", "Save draft");
    await save.evaluate((element) => {
      element.scrollIntoView({ block: "center" });
    });
    await keyboardFocus(page, browserName, save);
    const popup = popupOf(save);
    await expect(popup).toHaveAttribute("data-placed", "top");

    const outline = await popup.evaluate((element) => {
      const style = getComputedStyle(element);
      const arrow = getComputedStyle(element, "::before");
      return {
        text: style.color,
        border: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        arrow: arrow.borderBottomColor,
        arrowWidth: arrow.borderBottomWidth,
      };
    });
    expect(outline.border).toBe(outline.text);
    expect(outline.arrow).toBe(outline.text);
    expect(outline.border).not.toMatch(/^rgba\(\d+, \d+, \d+, 0\)$/);
    expect(outline.borderWidth).not.toBe("0px");
    expect(outline.arrowWidth).not.toBe("0px");
  });
});

test.describe("Tooltip at 320px wide (refinement R14.7, R14.9, R14.13)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("shifts inward from the viewport's edge, with the arrow still on the trigger", async ({
    page,
    browserName,
  }) => {
    await page.goto("/lab/components");
    const top = trigger(page, "Sides", "Top");
    const popup = popupOf(top);
    await top.evaluate((element) => {
      element.scrollIntoView({ block: "center" });
    });
    await keyboardFocus(page, browserName, top);

    const t = await rectOf(top);
    const p = await rectOf(popup);
    expect((t.left + t.right) / 2 - (p.right - p.left) / 2).toBeLessThan(offset);
    expect(p.left).toBeCloseTo(offset, 0);
    expect(Math.abs((await arrowCenter(popup)) - (t.left + t.right) / 2)).toBeLessThanOrEqual(1);
  });

  test("wraps a long tooltip inside the viewport", async ({ page, browserName }) => {
    await page.goto("/lab/components");
    const link = example(tooltipSection(page), "In running text").getByRole("link", {
      name: "the token gallery",
    });
    const popup = popupOf(link);
    await link.evaluate((element) => {
      element.scrollIntoView({ block: "center" });
    });
    await keyboardFocus(page, browserName, link);
    // A longer text than any lab example, set once hydrated (it shows), for this layout check only.
    const long =
      "Every color, type, space, size, radius, motion and effect token, with its value in each theme";
    await popup.evaluate((element, long) => {
      const text = element.querySelector("span");
      if (text) text.textContent = long;
    }, long);
    await expect(popup).toHaveText(long);

    const p = await rectOf(popup);
    expect(p.left).toBeGreaterThanOrEqual(offset - 0.5);
    expect(p.right).toBeLessThanOrEqual(320 - offset + 0.5);
    const lineHeight = await popup.evaluate((element) =>
      parseFloat(getComputedStyle(element).lineHeight),
    );
    expect(p.bottom - p.top).toBeGreaterThan(2 * lineHeight);
  });

  test("shows the header ThemeSwitcher's name on keyboard focus, and hides it when its menu opens", async ({
    page,
    browserName,
  }) => {
    await page.goto("/");
    const switcher = page.getByRole("banner").getByRole("button", { name: /^Theme/ });
    const popup = popupOf(switcher);
    await keyboardFocus(page, browserName, switcher);

    expect(await isOpen(popup)).toBe(true);
    await expect(popup).toHaveText(/^Theme: (Light|Dark)$/);
    await page.keyboard.press("Enter");
    await expect(switcher).toHaveAttribute("aria-expanded", "true");
    await expectOpen(popup, false);
  });
});

test("doesn't show the header ThemeSwitcher's name while its label is displayed (R14.13)", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  const switcher = page.getByRole("banner").getByRole("button", { name: /^Theme/ });
  await keyboardFocus(page, browserName, switcher);
  await page.waitForTimeout(400);
  expect(await isOpen(popupOf(switcher))).toBe(false);
});

test.describe("Tooltip on touch (refinement R14.11)", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("a tap shows only a disabled Button's reason, and a tap elsewhere hides it", async ({
    page,
  }) => {
    await page.goto("/lab/components");
    const done = trigger(page, "Icon-only names", "Mark as done");
    await done.scrollIntoViewIfNeeded();
    await done.tap();
    await page.waitForTimeout(500);
    expect(await isOpen(popupOf(done))).toBe(false);

    const publish = trigger(page, "Disabled reason", "Publish");
    await publish.scrollIntoViewIfNeeded();
    // Playwright counts aria-disabled as disabled; a real tap still lands.
    await publish.tap({ force: true });
    await expectOpen(popupOf(publish));
    await expect(popupOf(publish)).toHaveText("Add a title first");

    await example(tooltipSection(page), "Disabled reason")
      .getByText("Press or tap it to see why it's disabled.")
      .tap();
    await expectOpen(popupOf(publish), false);
  });
});
