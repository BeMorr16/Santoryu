import { expect, test, type Locator, type Page } from "@playwright/test";
import { section, tabKey } from "./support.ts";

const actions = (page: Page) =>
  section(page, "Menu").getByRole("button", { name: "Project actions" });

async function popupOf(page: Page, trigger: Locator) {
  return page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`);
}

const item = (menu: Locator, name: string) =>
  menu
    .getByRole("menuitem", { name, exact: true })
    .or(menu.getByRole("menuitemradio", { name, exact: true }));

test.describe("Menu keyboard behavior with real focus (R12.3–R12.6, R16.5)", () => {
  test("opens on Enter at the checked item, moves, wraps, types ahead, and activates", async ({
    page,
  }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await expect(item(menu, "Newest first")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Oldest first")).toBeFocused();
    await page.keyboard.press("End");
    await expect(item(menu, "Delete")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Newest first")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(item(menu, "Newest first")).toBeFocused();
    await page.keyboard.press("d");
    await expect(item(menu, "Download")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(section(page, "Menu")).toContainText("last action: Download");
  });

  test("opens with ArrowDown on the first item and ArrowUp on the last", async ({ page }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Newest first")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toBeFocused();
  });

  test("selects a radio item with Space, closes, and doesn't reopen on the key release", async ({
    page,
  }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Space");
    await expect(menu).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Name")).toBeFocused();
    await page.keyboard.press("Space");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(section(page, "Menu")).toContainText("Sorted by name");
    await trigger.click();
    await expect(item(menu, "Name")).toHaveAttribute("aria-checked", "true");
  });

  test("never activates a disabled item, and stays open", async ({ page }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Enter");

    await expect(menu).toBeVisible();
    await expect(section(page, "Menu")).toContainText("last action: nothing yet");
  });

  test("closes on Escape with focus back on the trigger", async ({ page }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.click();
    await page.keyboard.press("Escape");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("closes on Tab and lets focus move on", async ({ page, browserName }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press(tabKey(browserName));

    await expect(menu).toBeHidden();
    await expect(trigger).not.toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.closest('[role="menu"]'))).toBeNull();
  });

  test("closes on an outside click without moving focus to the trigger", async ({ page }) => {
    await page.goto("/lab/components");
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.click();
    await section(page, "Menu").getByRole("heading", { name: "Menu", exact: true }).click();

    await expect(menu).toBeHidden();
    await expect(trigger).not.toBeFocused();
  });
});

/** Popup and trigger boxes, and whether the popup is fully in the viewport and on top. */
async function placement(page: Page, trigger: Locator) {
  const menu = await popupOf(page, trigger);
  await trigger.click();
  await expect(menu).toBeVisible();
  // Let the opening fade/slide finish (0ms under reduced motion, so emulate it).
  return menu.evaluate(
    (popup, triggerId) => {
      const triggerBox = document.getElementById(triggerId)?.getBoundingClientRect();
      const box = popup.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        popup: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
        trigger: triggerBox && {
          left: triggerBox.left,
          right: triggerBox.right,
          top: triggerBox.top,
          bottom: triggerBox.bottom,
        },
        inViewport:
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= document.documentElement.clientWidth &&
          box.bottom <= document.documentElement.clientHeight,
        onTop: top !== null && popup.contains(top),
      };
    },
    (await trigger.getAttribute("id")) ?? "",
  );
}

/** Pins a menu's root to a corner of the viewport. */
async function pinMenu(trigger: Locator, corner: Readonly<Record<string, string>>) {
  await trigger.evaluate((element, position) => {
    const root = element.parentElement;
    if (!root) throw new Error("menu root missing");
    root.style.setProperty("position", "fixed");
    root.style.setProperty("z-index", "10");
    for (const [side, value] of Object.entries(position)) root.style.setProperty(side, value);
  }, corner);
}

for (const mode of ["anchor", "fallback"] as const) {
  test.describe(`Menu placement, ${mode} positioning (R12.8)`, () => {
    test.use({ reducedMotion: "reduce" });

    test.beforeEach(async ({ page }) => {
      if (mode === "fallback") {
        // Forces the JS positioner, as in a browser without CSS anchor positioning.
        await page.addInitScript(() => {
          const supports = CSS.supports.bind(CSS);
          CSS.supports = (condition: string, value?: string) =>
            /anchor/.test(condition)
              ? false
              : value === undefined
                ? supports(condition)
                : supports(condition, value);
        });
      }
      await page.goto("/lab/components");
    });

    test("puts each of two menus under its own trigger", async ({ page }) => {
      for (const trigger of [
        actions(page),
        section(page, "Button").getByRole("button", { name: /\(Button preview\)$/ }),
      ]) {
        await trigger.scrollIntoViewIfNeeded();
        const result = await placement(page, trigger);
        await page.keyboard.press("Escape");

        expect(result.inViewport).toBe(true);
        expect(result.onTop).toBe(true);
        // Start-aligned, or end-aligned when there's no room to the end (flip-inline).
        const startAligned = Math.abs(result.popup.left - (result.trigger?.left ?? NaN)) <= 1;
        const endAligned = Math.abs(result.popup.right - (result.trigger?.right ?? NaN)) <= 1;
        expect(startAligned || endAligned).toBe(true);
        expect(result.popup.top).toBeGreaterThanOrEqual(result.trigger?.bottom ?? NaN);
        expect(result.popup.top - (result.trigger?.bottom ?? NaN)).toBeLessThanOrEqual(16);
      }
    });

    for (const [name, corner] of [
      ["top left", { top: "0", left: "0" }],
      ["top right", { top: "0", right: "0" }],
      ["bottom left", { bottom: "0", left: "0" }],
      ["bottom right", { bottom: "0", right: "0" }],
    ] as const) {
      test(`stays inside the viewport from the ${name} corner`, async ({ page }) => {
        const trigger = actions(page);
        await pinMenu(trigger, corner);

        const result = await placement(page, trigger);

        expect(result.inViewport).toBe(true);
        expect(result.onTop).toBe(true);
        if ("bottom" in corner)
          expect(result.popup.bottom).toBeLessThanOrEqual(result.trigger?.top ?? NaN);
        else expect(result.popup.top).toBeGreaterThanOrEqual(result.trigger?.bottom ?? NaN);
      });
    }

    test("fits and scrolls inside a 320×256 viewport (400% zoom), keeping the focused item visible", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 256 });
      const trigger = actions(page);
      await trigger.scrollIntoViewIfNeeded();
      const result = await placement(page, trigger);
      expect(result.inViewport).toBe(true);
      await page.keyboard.press("End");

      const menu = await popupOf(page, trigger);
      await expect(item(menu, "Delete")).toBeFocused();
      await expect(item(menu, "Delete")).toBeInViewport({ ratio: 1 });
    });

    test("opens in the same place a second time", async ({ page }) => {
      const trigger = actions(page);
      await trigger.scrollIntoViewIfNeeded();
      const first = await placement(page, trigger);
      await page.keyboard.press("Escape");
      const second = await placement(page, trigger);

      expect(second.popup).toEqual(first.popup);
    });

    test("isn't clipped by an overflow: hidden ancestor", async ({ page }) => {
      const trigger = actions(page);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.evaluate((element) => {
        const clip = element.closest('[role="group"]');
        if (!(clip instanceof HTMLElement)) throw new Error("panel missing");
        clip.style.setProperty("overflow", "hidden");
        clip.style.setProperty(
          "max-block-size",
          `${String(element.getBoundingClientRect().bottom - clip.getBoundingClientRect().top)}px`,
        );
      });

      const result = await placement(page, trigger);

      expect(result.onTop).toBe(true);
      expect(result.inViewport).toBe(true);
    });
  });
}
