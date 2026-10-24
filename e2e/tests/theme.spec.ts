import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { chooseInMenu, example, main, storeTheme, tokenColor } from "./support.ts";

// surface.base per theme, from the token metadata.
const pageBackground = {
  light: tokenColor("color.surface.base", "light"),
  dark: tokenColor("color.surface.base", "dark"),
};

const switcher = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Theme: / });

/** Below size.breakpoint.md the header's switcher is in the Menu panel (site-refresh R8.2). */
async function openHeaderPanel(page: Page) {
  const menu = page.getByRole("banner").getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
}
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("theme before first paint (R13.4, R16.4)", () => {
  for (const [stored, os] of [
    ["dark", "light"],
    ["light", "dark"],
  ] as const) {
    test(`applies a stored ${stored} theme under an OS ${os} preference with no app script`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: os });
      await storeTheme(page, stored);
      // Only the inline pre-paint script can run: every JS file is blocked.
      await page.route("**/*.js", (route) => route.abort());

      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.locator("html")).toHaveAttribute("data-theme", stored);
      expect(await background(page)).toBe(pageBackground[stored]);
    });
  }
});

test.describe("first paint with no choice (R13.2)", () => {
  for (const [os, shown] of [
    ["light", "Sun"],
    ["dark", "Moon"],
  ] as const) {
    test(`shows the ${shown.toLowerCase()} icon for an OS ${os} scheme with no app script`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: os });
      await page.route("**/*.js", (route) => route.abort());

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // The switcher's trigger: before hydration its name is just "Theme".
      const icons = page.getByRole("banner").locator('button[aria-haspopup="menu"] svg');
      await expect(icons).toHaveCount(4);
      const visible = await icons.evaluateAll((svgs) =>
        svgs.map((svg) => getComputedStyle(svg).display !== "none"),
      );
      // Light icon first, then dark, then a custom theme's palette, then the chevron, shown in
      // both schemes (ThemeSwitcher.tsx).
      expect(visible).toEqual(
        shown === "Sun" ? [true, false, false, true] : [false, true, false, true],
      );
    });
  }
});

/** The open popup's and its trigger's boxes, and whether the popup is inside the viewport. */
async function openPopup(page: Page, trigger: Locator) {
  await trigger.click();
  const popup = page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`);
  await expect(popup).toBeVisible();
  const box = await popup.evaluate((element) => {
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return {
      left,
      right,
      top,
      bottom,
      inViewport:
        left >= 0 &&
        top >= 0 &&
        right <= document.documentElement.clientWidth &&
        bottom <= document.documentElement.clientHeight,
    };
  });
  const triggerBox = await trigger.evaluate((element) => {
    const { left, right, bottom } = element.getBoundingClientRect();
    return { left, right, bottom };
  });
  return { element: popup, popup: box, trigger: triggerBox };
}

/** The visible "Theme" label inside a switcher's trigger. */
const visibleLabel = (trigger: Locator) => trigger.getByText("Theme", { exact: true });

test.describe("placement, label and chevron (refinement R10.1–R10.3)", () => {
  test.beforeEach(async ({ page }) => {
    // The popup fades and slides in; under reduced motion that takes 0ms.
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("the header popup lines up with the trigger's end edge, below it, on a wide window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");

    const { element, popup, trigger } = await openPopup(page, switcher(page));

    // At the end edge a start-aligned popup would flip to the same place, so check the request too.
    await expect(element).toHaveAttribute("data-align", "end");
    expect(Math.abs(popup.right - trigger.right)).toBeLessThanOrEqual(1);
    expect(popup.top).toBeGreaterThanOrEqual(trigger.bottom);
    expect(popup.inViewport).toBe(true);
  });

  test("the header popup stays inside a 320px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    await openHeaderPanel(page);

    const { popup } = await openPopup(page, switcher(page));

    expect(popup.inViewport).toBe(true);
  });

  test("a start-aligned switcher at the row's start lines up with its start edge in the showcase", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(componentPath("theme-switcher"));
    const triggers = example(
      main(page),
      "Placement (changes the whole site, not this panel)",
    ).getByRole("button", { name: /^Theme: / });

    const start = await openPopup(page, triggers.first());
    await page.keyboard.press("Escape");
    const end = await openPopup(page, triggers.last());

    expect(Math.abs(start.popup.left - start.trigger.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(end.popup.right - end.trigger.right)).toBeLessThanOrEqual(1);
  });

  test("the header's switcher is icon-only at every size, with the same name (site-refresh design §4.2)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    await openHeaderPanel(page);
    await expect(visibleLabel(switcher(page))).toHaveCount(0);
    await expect(switcher(page)).toHaveAccessibleName(/^Theme: (Light|Dark)$/);

    await page.setViewportSize({ width: 1280, height: 720 });

    await expect(visibleLabel(switcher(page))).toHaveCount(0);
    await expect(switcher(page)).toHaveAccessibleName(/^Theme: (Light|Dark)$/);
  });

  test("showLabel overrides the breakpoint either way in the showcase", async ({ page }) => {
    await page.goto(componentPath("theme-switcher"));
    const triggers = example(
      main(page),
      "Label (changes the whole site, not this panel)",
    ).getByRole("button", { name: /^Theme: / });
    await expect(triggers).toHaveCount(3);
    const [auto, always, never] = [triggers.nth(0), triggers.nth(1), triggers.nth(2)];

    await page.setViewportSize({ width: 320, height: 640 });
    await expect(visibleLabel(auto)).toBeHidden();
    await expect(visibleLabel(always)).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(visibleLabel(auto)).toBeVisible();
    await expect(visibleLabel(never)).toHaveCount(0);
    for (const trigger of [auto, always, never]) {
      await expect(trigger).toHaveAccessibleName(/^Theme: (Light|Dark)$/);
    }
  });

  test("Space on a theme applies it, closes the menu and returns focus to the trigger (refinement R10.4)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const trigger = switcher(page);
    const popup = page.locator(`[id="${(await trigger.getAttribute("aria-controls")) ?? ""}"]`);
    await trigger.click();
    await expect(popup.getByRole("menuitemradio", { name: "Light" })).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");

    await expect(popup).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName("Theme: Dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the header chevron flips while the menu is open", async ({ page }) => {
    await page.goto("/");
    const chevron = switcher(page).locator("svg").last();
    await expect(chevron).toBeVisible();
    await expect(chevron).toHaveCSS("rotate", "none");

    await switcher(page).click();
    await expect(chevron).toHaveCSS("rotate", "180deg");

    await page.keyboard.press("Escape");
    await expect(chevron).toHaveCSS("rotate", "none");
  });
});

test.describe("preference across pages (R13.3, R16.4)", () => {
  test("survives reload and client-side navigation", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await chooseInMenu(page, switcher(page), "Dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(switcher(page)).toHaveAccessibleName("Theme: Dark");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Design System" })
      .click();
    await expect(page).toHaveURL(/\/design-system$/);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(page)).toBe(pageBackground.dark);
  });

  test("with no choice, shows and follows the OS scheme live (R13.6)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await expect(switcher(page)).toHaveAccessibleName("Theme: Light");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await background(page)).toBe(pageBackground.dark);
    await expect(switcher(page)).toHaveAccessibleName("Theme: Dark");
    await page.emulateMedia({ colorScheme: "light" });
    expect(await background(page)).toBe(pageBackground.light);
    await expect(switcher(page)).toHaveAccessibleName("Theme: Light");
  });

  test("a choice wins over a later OS change", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await chooseInMenu(page, switcher(page), "Light");
    await page.emulateMedia({ colorScheme: "dark" });

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await background(page)).toBe(pageBackground.light);
    await expect(switcher(page)).toHaveAccessibleName("Theme: Light");
  });

  test("follows a change made in another tab (R13.7)", async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto("/");
    await second.goto("/design-system");

    await chooseInMenu(first, switcher(first), "Dark");

    await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(switcher(second)).toHaveAccessibleName("Theme: Dark");
  });
});

test.describe("fallbacks (R13.5, R13.9)", () => {
  test("follows the OS without errors when storage throws, and still applies a choice", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    // Only localStorage, which R13.5 is about. (Blocking sessionStorage too makes React Router's
    // ScrollRestoration script log an error of its own; that's outside the theme code.)
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("Storage is disabled", "SecurityError");
        },
      });
    });
    await page.goto("/");

    await expect(switcher(page)).toHaveAccessibleName("Theme: Light");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await chooseInMenu(page, switcher(page), "Dark");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(switcher(page)).toHaveAccessibleName("Theme: Dark");
    expect(errors).toEqual([]);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false, colorScheme: "dark" });

    test("hides the switcher and renders the system theme", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("banner").getByRole("button")).toHaveCount(0);
      await expect(page.locator("html")).not.toHaveAttribute("data-js");
      expect(await background(page)).toBe(pageBackground.dark);
    });
  });
});
