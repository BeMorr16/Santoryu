import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { main, storeTheme, tabKey, themes } from "./support.ts";

/** A trigger in the Menu page's examples panel, past its main example (ds-components R4.6). */
const menuTrigger = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Menu examples", exact: true })
    .getByRole("button", { name, exact: true });
const actions = (page: Page) => menuTrigger(page, "Project actions");

async function popupOf(page: Page, trigger: Locator) {
  return page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`);
}

/** The live line after a menu in its showcase example. */
const liveLine = (trigger: Locator) => trigger.locator("xpath=../following-sibling::p[1]");

const item = (menu: Locator, name: string) =>
  menu
    .getByRole("menuitem", { name, exact: true })
    .or(menu.getByRole("menuitemradio", { name, exact: true }))
    .or(menu.getByRole("menuitemcheckbox", { name, exact: true }));

/**
 * What `property: value` computes to inside `scope`, read from a probe element set through CSSOM
 * (allowed by the CSP). A token's custom property resolves in the scope's theme. With `forced`,
 * the probe opts out of forced colors, so a system color reads back as itself.
 */
async function probe(scope: Locator, property: string, value: string, forced = false) {
  return scope.evaluate(
    (element, { property, value, forced }) => {
      const probe = document.createElement("div");
      probe.style.setProperty(property, value);
      if (forced) probe.style.setProperty("forced-color-adjust", "none");
      element.append(probe);
      const computed = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return computed;
    },
    { property, value, forced },
  );
}

test.describe("Menu keyboard behavior with real focus (R12.3–R12.6, R16.5)", () => {
  test("opens on Enter at the first item, moves, wraps, types ahead, and activates", async ({
    page,
  }) => {
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await expect(item(menu, "Copy link")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Download")).toBeFocused();
    await page.keyboard.press("End");
    await expect(item(menu, "Delete")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Copy link")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(item(menu, "Copy link")).toBeFocused();
    await page.keyboard.press("d");
    await expect(item(menu, "Download")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(liveLine(trigger)).toHaveText("Last action: Download.");
  });

  test("opens with ArrowDown on the first item and ArrowUp on the last", async ({ page }) => {
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(item(menu, "Copy link")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toBeFocused();
  });

  test("runs an action with Space, closes, and doesn't reopen on the key release", async ({
    page,
  }) => {
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Space");
    await expect(menu).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(liveLine(trigger)).toHaveText("Last action: Download.");
  });

  test("opens on the checked radio item, checks with Space and stays open, and closes on Enter (refinement R5.9)", async ({
    page,
  }) => {
    await page.goto(componentPath("menu"));
    const trigger = menuTrigger(page, "Sort by");
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Space");
    await expect(item(menu, "Newest first")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");

    await expect(menu).toBeVisible();
    await expect(item(menu, "Name")).toBeFocused();
    await expect(item(menu, "Name")).toHaveAttribute("aria-checked", "true");
    await expect(liveLine(trigger)).toHaveText("Sorted by name.");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(liveLine(trigger)).toHaveText("Sorted by oldest.");
  });

  test("toggles a checkbox item with Space and stays open, and closes on Enter (refinement R5.9)", async ({
    page,
  }) => {
    await page.goto(componentPath("menu"));
    const trigger = menuTrigger(page, "View");
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(item(menu, "Grid")).toBeFocused();
    await page.keyboard.press("End");
    await page.keyboard.press("Space");

    await expect(menu).toBeVisible();
    await expect(item(menu, "Show archived")).toHaveAttribute("aria-checked", "true");
    await expect(liveLine(trigger)).toHaveText("Descriptions shown; archived shown.");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(liveLine(trigger)).toHaveText("Descriptions hidden; archived shown.");
  });

  test("never activates a disabled item, and stays open", async ({ page }) => {
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Delete")).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Enter");

    await expect(menu).toBeVisible();
    await expect(liveLine(trigger)).toHaveText("Last action: nothing yet.");
  });

  test("closes on Escape with focus back on the trigger", async ({ page }) => {
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.click();
    await page.keyboard.press("Escape");

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("closes on Tab and lets focus move on", async ({ page, browserName }) => {
    await page.goto(componentPath("menu"));
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
    await page.goto(componentPath("menu"));
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);

    await trigger.click();
    await main(page).getByRole("heading", { level: 1, name: "Menu", exact: true }).click();

    await expect(menu).toBeHidden();
    await expect(trigger).not.toBeFocused();
  });
});

test.describe("Menu look and pointer behavior (refinement R5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("menu"));
  });

  test("keeps its own item type inside larger text (R5.2)", async ({ page }) => {
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);
    const expected = await probe(menu, "font-size", "var(--component-menu-item-font-size)");
    await trigger.evaluate((element) => {
      element.parentElement?.parentElement?.style.setProperty("font-size", "2rem");
    });

    await trigger.click();

    await expect(item(menu, "Copy link")).toHaveCSS("font-size", expected);
  });

  test("focuses the item under the mouse, so only it is highlighted (R5.3)", async ({ page }) => {
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);
    await trigger.click();
    const highlight = await probe(
      menu,
      "background-color",
      "var(--component-menu-item-background-focus)",
    );

    await item(menu, "Download").hover();

    await expect(item(menu, "Download")).toBeFocused();
    await expect(item(menu, "Download")).toHaveCSS("background-color", highlight);
    for (const name of ["Copy link", "Delete"]) {
      await expect(item(menu, name)).not.toHaveCSS("background-color", highlight);
    }
  });

  test("shows an open trigger in its pressed background, hovered or not, and flips its chevron (R5.4)", async ({
    page,
  }) => {
    const trigger = menuTrigger(page, "Sort by");
    const active = await probe(
      trigger.locator(".."),
      "background-color",
      "var(--component-button-secondary-background-active)",
    );
    const chevron = trigger.locator("svg").last();
    await expect(chevron).toHaveCSS("rotate", "none");

    await trigger.click();
    await expect(trigger).toHaveCSS("background-color", active);
    await expect(chevron).toHaveCSS("rotate", "180deg");
    await main(page).getByRole("heading", { level: 1, name: "Menu", exact: true }).hover();
    await expect(trigger).toHaveCSS("background-color", active);

    await page.keyboard.press("Escape");
    await expect(chevron).toHaveCSS("rotate", "none");
  });

  test("draws the keyboard focus ring in its own token color (R5.1)", async ({ page }) => {
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);
    const ring = await probe(menu, "color", "var(--component-menu-item-focus-ring-color)");

    await trigger.focus();
    await page.keyboard.press("Enter");

    await expect(item(menu, "Copy link")).toHaveCSS("outline-color", ring);
  });

  test("uses Highlight for the focused item and GrayText for disabled ones under forced colors (R5.5)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const trigger = actions(page);
    const menu = await popupOf(page, trigger);
    const highlight = await probe(menu, "background-color", "Highlight", true);
    const highlightText = await probe(menu, "color", "HighlightText", true);
    const grayText = await probe(menu, "color", "GrayText", true);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(item(menu, "Copy link")).toHaveCSS("background-color", highlight);
    await expect(item(menu, "Copy link")).toHaveCSS("color", highlightText);
    await expect(item(menu, "Delete")).toHaveCSS("color", grayText);

    await page.keyboard.press("End");
    await expect(item(menu, "Delete")).toHaveCSS("color", grayText);
    await expect(item(menu, "Delete")).not.toHaveCSS("background-color", highlight);
    await expect(item(menu, "Delete")).toHaveCSS("outline-color", highlight);
  });

  test("leaves the menu open on a middle-click on a link item (R5.8)", async ({ page }) => {
    await page
      .context()
      .route("https://github.com/**", (route) =>
        route.fulfill({ contentType: "text/html", body: "<title>GitHub stub</title>" }),
      );
    const trigger = menuTrigger(page, "Contact");
    const menu = await popupOf(page, trigger);
    await trigger.click();

    // A middle-click is an auxclick, not a click: the browser handles the link, the menu stays.
    await menu
      .getByRole("menuitem", { name: /^GitHub ?, opens in new tab$/ })
      .click({ button: "middle" });

    await expect(menu).toBeVisible();
  });

  test("follows a new-tab link item with Space (R5.8)", async ({ page }) => {
    await page
      .context()
      .route("https://github.com/**", (route) =>
        route.fulfill({ contentType: "text/html", body: "<title>GitHub stub</title>" }),
      );
    const trigger = menuTrigger(page, "Contact");
    const menu = await popupOf(page, trigger);

    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    const link = menu.getByRole("menuitem", { name: /^GitHub ?, opens in new tab$/ });
    await expect(link).toBeFocused();
    const [opened] = await Promise.all([
      page.context().waitForEvent("page"),
      page.keyboard.press("Space"),
    ]);

    expect(opened.url()).toBe("https://github.com/");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

for (const theme of themes) {
  test(`open menus in ${theme} have no axe violations, contrast included (refinement R5)`, async ({
    page,
  }) => {
    await storeTheme(page, theme);
    await page.goto(componentPath("menu"));

    for (const name of ["View", "Contact"]) {
      const trigger = menuTrigger(page, name);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const menu = await popupOf(page, trigger);
      await expect(menu).toBeVisible();
      // axe reads mid-fade colors as low contrast (WebKit flake, refinement R11.13).
      await expect(menu).toHaveCSS("opacity", "1");

      const { violations } = await new AxeBuilder({ page })
        .include(`[id="${(await menu.getAttribute("id")) ?? ""}"]`)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(violations.map((violation) => violation.id)).toEqual([]);
      await page.keyboard.press("Escape");
    }
  });
}

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
      await page.goto(componentPath("menu"));
    });

    test("puts each of two menus under its own trigger", async ({ page }) => {
      for (const trigger of [
        actions(page),
        main(page).getByRole("button", { name: /\(Menu examples preview\)$/ }),
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
      const last = item(menu, "Delete");
      await expect(last).toBeFocused();
      // TODO(Menu): Chromium snaps the popup's scrollTop to whole pixels, so at a fractional popup
      // position the focused item can sit under its edge by a fraction of a pixel (refinement
      // design §12.9). Until Menu handles it, up to 1px may be clipped.
      const height = (await last.boundingBox())?.height ?? Number.NaN;
      await expect(last).toBeInViewport({ ratio: 1 - 1 / height });
    });

    test("opens in the same place a second time", async ({ page }) => {
      const trigger = actions(page);
      await trigger.scrollIntoViewIfNeeded();
      const first = await placement(page, trigger);
      await page.keyboard.press("Escape");
      const second = await placement(page, trigger);

      expect(second.popup).toEqual(first.popup);
    });

    for (const [label, side, align] of [
      ["Bottom start", "bottom", "start"],
      ["Bottom end", "bottom", "end"],
      ["Top start", "top", "start"],
      ["Top end", "top", "end"],
    ] as const) {
      test(`opens ${label.toLowerCase()} and slides in from that side (refinement R5.12)`, async ({
        page,
      }) => {
        const trigger = menuTrigger(page, label);
        await trigger.scrollIntoViewIfNeeded();

        const result = await placement(page, trigger);

        expect(result.inViewport).toBe(true);
        if (side === "bottom") {
          expect(result.popup.top).toBeGreaterThanOrEqual(result.trigger?.bottom ?? NaN);
        } else {
          expect(result.popup.bottom).toBeLessThanOrEqual(result.trigger?.top ?? NaN);
        }
        const edge = align === "start" ? "left" : "right";
        expect(Math.abs(result.popup[edge] - (result.trigger?.[edge] ?? NaN))).toBeLessThanOrEqual(
          1,
        );
        const slide = await probe(await popupOf(page, trigger), "margin-top", "var(--_slide)");
        expect(Math.sign(parseFloat(slide))).toBe(side === "top" ? 1 : -1);
      });
    }

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
