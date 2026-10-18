import { expect, test, type Page } from "@playwright/test";
import { chooseInMenu, storeTheme } from "./support.ts";

// surface.base per theme (decision 0006): sand.50 and blue.850.
const pageBackground = { light: "rgb(251, 248, 242)", dark: "rgb(18, 62, 94)" };

const switcher = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Theme: / });
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

      const icons = page.getByRole("banner").locator("button svg");
      await expect(icons).toHaveCount(2);
      const visible = await icons.evaluateAll((svgs) =>
        svgs.map((svg) => getComputedStyle(svg).display !== "none"),
      );
      // Light icon first, then dark (ThemeSwitcher.tsx).
      expect(visible).toEqual(shown === "Sun" ? [true, false] : [false, true]);
    });
  }
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
      .getByRole("link", { name: "Lab" })
      .click();
    await expect(page).toHaveURL(/\/lab$/);

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
    await second.goto("/lab");

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
