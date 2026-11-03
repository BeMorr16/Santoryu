import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { themeCreatorPath } from "../../web/src/design-system/components/pages.ts";
import { storeTheme, tabKey, themes } from "./support.ts";

/** Replaces a color key control's hex text; it applies as soon as it parses. */
async function setHex(page: Page, control: string, hex: string) {
  const field = page.getByRole("group", { name: control, exact: true }).getByRole("textbox", {
    name: "Hex",
  });
  await field.fill(hex);
}

const preview = (page: Page) => page.getByRole("region", { name: "Preview" });

/** Names a theme that isn't saved yet in Save's dialog, and saves it. */
async function nameAndSave(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name: "Save theme" });
  await dialog.getByRole("textbox", { name: "Theme name" }).fill(name);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
}

test.describe("theme creator (theme-creator R16.3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(themeCreatorPath);
    await expect(page.getByRole("button", { name: "New theme" })).toBeVisible();
  });

  test("an Action color change restyles the preview's primary button, and only the preview", async ({
    page,
  }) => {
    await setHex(page, "Action", "#2a8556");

    await expect(preview(page).getByRole("button", { name: "Primary", exact: true })).toHaveCSS(
      "background-color",
      "rgb(42, 133, 86)",
    );
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--color-action-background"),
      ),
    ).not.toBe("#2a8556");
  });

  test("pairs the four color controls on a wide screen, and stacks them on a narrow one", async ({
    page,
  }) => {
    const box = async (name: string) => {
      const found = await page.getByRole("group", { name, exact: true }).boundingBox();
      if (!found) throw new Error(`No ${name} control`);
      return found;
    };

    await page.setViewportSize({ width: 1440, height: 900 });
    const [action, accent, accent2, background] = [
      await box("Action"),
      await box("Accent"),
      await box("Second accent"),
      await box("Background"),
    ];
    expect(accent.y).toBe(action.y);
    expect(accent.x).toBeGreaterThan(action.x + action.width);
    expect(background.y).toBe(accent2.y);
    expect(accent2.y).toBeGreaterThan(action.y + action.height);

    await page.setViewportSize({ width: 768, height: 900 });
    const [narrowAction, narrowAccent] = [await box("Action"), await box("Accent")];
    expect(narrowAccent.x).toBe(narrowAction.x);
    expect(narrowAccent.y).toBeGreaterThan(narrowAction.y + narrowAction.height);
  });

  test("a saved theme chosen in the switcher applies on the next page before any app script runs (R9.3)", async ({
    page,
  }) => {
    // Dark enough for white text at 4.5:1, so Save has no contrast warning to show.
    await setHex(page, "Action", "#1a5f7a");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await nameAndSave(page, "Ocean");
    await expect(page.getByText("Saved Ocean")).toBeVisible();

    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Theme/ })
      .click();
    await page.getByRole("menuitemradio", { name: "Ocean" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);

    // Only the inline pre-paint script can run: every JS file is blocked.
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/design-system/tokens", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-action-background")
          .trim(),
      ),
    ).toBe("#1a5f7a");
  });

  test("has no axe violations with a custom theme selected site-wide (R15.4)", async ({ page }) => {
    await setHex(page, "Action", "#1e6b45");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await nameAndSave(page, "Forest");
    await expect(page.getByText("Saved Forest")).toBeVisible();
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Theme/ })
      .click();
    await page.getByRole("menuitemradio", { name: "Forest" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(
      violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.target.join(" ")}`)),
    ).toEqual([]);
  });

  test("the contrast warning keeps focus inside, closes on Escape and returns focus to Save (R3.3)", async ({
    page,
    browserName,
  }) => {
    await setHex(page, "Second accent", "#f4f0fd");
    // From the keyboard: WebKit, like Safari, doesn't focus a button on a click, so a click
    // leaves no focused opener to return to.
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.focus();
    await page.keyboard.press("Enter");
    // The name dialog opens with its field focused; Enter submits it, and the warning replaces it.
    const name = page.getByRole("dialog", { name: "Save theme" }).getByRole("textbox");
    await expect(name).toBeFocused();
    await page.keyboard.type("Pale");
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("alertdialog", { name: /contrast issues?$/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeFocused();
    // Focus may step out to the browser's own UI (the body, from the page's side), but never to
    // the page behind the modal, which is inert.
    for (let press = 0; press < 12; press++) {
      await page.keyboard.press(tabKey(browserName));
      expect(
        await dialog.evaluate(
          (element) =>
            document.activeElement === document.body || element.contains(document.activeElement),
        ),
        `Tab ${String(press + 1)}`,
      ).toBe(true);
    }
    // Where the Tabs end depends on how many issues are listed. On Close, its name tooltip would
    // take the first Escape (R12.4, tested below), so Escape starts from a button with none.
    await dialog.getByRole("button", { name: "Keep editing" }).focus();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(save).toBeFocused();
  });
});

/**
 * Saves `count` themes through the editor, as a visitor would: "Theme 1" and on, each a new theme
 * from Light with its own Action color (each passes contrast, so Save shows no warning).
 */
async function saveThemes(page: Page, count: number) {
  const colors = ["#1e6b45", "#1a5f7a", "#5b3fa6"];
  for (const [index, action] of colors.slice(0, count).entries()) {
    const name = `Theme ${String(index + 1)}`;
    if (index > 0) {
      await page.getByRole("button", { name: "New theme" }).click();
      await page.getByRole("menuitem", { name: "Light", exact: true }).click();
    }
    await setHex(page, "Action", action);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await nameAndSave(page, name);
    await expect(page.getByText(`Saved ${name}`, { exact: true })).toBeAttached();
  }
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.flatMap(({ id, nodes }) => nodes.map((node) => `${id}: ${node.target.join(" ")}`)),
  ).toEqual([]);
}

const library = (page: Page) => page.getByRole("region", { name: "Your themes" });
const card = (page: Page, name: string) =>
  library(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });

test.describe("theme creator controls (theme-creator-controls R7.2)", () => {
  test("from 48em the toolbar stays pinned below the header, marks the section in view, and its links land clear of it (R5.2–R5.4)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(themeCreatorPath);
    const links = page.getByRole("navigation", { name: "Editor sections" });
    const toolbar = links.locator("..");
    await expect(links).toBeVisible();

    await page.locator("#section-spacing").evaluate((heading) => {
      heading.scrollIntoView({ block: "start" });
    });

    await expect(links.getByRole("link", { name: "Spacing" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await expect(async () => {
      const bar = await toolbar.boundingBox();
      const header = await page.getByRole("banner").boundingBox();
      if (!bar || !header) throw new Error("no toolbar or header");
      // A gap of space.stack.sm (0.5rem, 8px) below the header, as the header keeps from the top.
      expect(Math.abs(bar.y - (header.y + header.height + 8))).toBeLessThanOrEqual(1);
    }).toPass();

    await links.getByRole("link", { name: "Typography" }).click();

    await expect(async () => {
      const heading = await page.locator("#section-typography").boundingBox();
      const bar = await toolbar.boundingBox();
      if (!heading || !bar) throw new Error("no heading or toolbar");
      expect(heading.y).toBeGreaterThanOrEqual(bar.y + bar.height);
      expect(heading.y + heading.height).toBeLessThanOrEqual(800);
    }).toPass();
    await expect(links.getByRole("link", { name: "Typography" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await expect(links.getByRole("link", { name: "Spacing" })).not.toHaveAttribute("aria-current");
  });

  test("from 48em, keyboard focus in the editor stays clear of the pinned toolbar, both ways (R5.2; WCAG 2.4.11)", async ({
    page,
    browserName,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(themeCreatorPath);
    await page.getByRole("button", { name: "Save", exact: true }).focus();

    /** Whether the focused element is clear of the toolbar; null for the pinned bars themselves. */
    const check = () =>
      page.evaluate(() => {
        const focused = document.activeElement;
        const toolbar = document.querySelector('nav[aria-label="Editor sections"]')?.parentElement;
        if (!(focused instanceof HTMLElement) || !toolbar || !focused.closest("main")) return null;
        if (toolbar.contains(focused)) return null;
        const inAside = focused.closest("#theme-creator-aside") !== null;
        const { top } = focused.getBoundingClientRect();
        const name =
          focused.getAttribute("aria-label") ??
          (focused instanceof HTMLInputElement ? focused.labels?.[0]?.textContent : null) ??
          focused.textContent;
        return {
          label: `${focused.tagName.toLowerCase()} "${name.trim().slice(0, 40)}" at ${String(Math.round(top))}, toolbar bottom ${String(Math.round(toolbar.getBoundingClientRect().bottom))}`,
          clear: top >= toolbar.getBoundingClientRect().bottom - 0.5,
          inAside,
        };
      });
    const covered: string[] = [];
    let steps = 0;
    for (; steps < 200; steps++) {
      await page.keyboard.press(tabKey(browserName));
      const result = await check();
      if (result === null) continue;
      // The preview and chain column is pinned beside the editor, not under the toolbar.
      if (result.inAside) break;
      if (!result.clear) covered.push(`forward: ${result.label}`);
    }
    expect(steps).toBeLessThan(200);
    for (let back = 0; back < steps; back++) {
      await page.keyboard.press(tabKey(browserName, true));
      const result = await check();
      if (result === null || result.inAside) continue;
      if (!result.clear) covered.push(`back: ${result.label}`);
    }

    expect(covered).toEqual([]);
  });

  test("a section link followed from the keyboard continues focus from its section (R5.2)", async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(themeCreatorPath);
    const links = page.getByRole("navigation", { name: "Editor sections" });
    await links.getByRole("link", { name: "Typography" }).focus();

    await page.keyboard.press("Enter");
    await page.keyboard.press(tabKey(browserName));

    expect(
      await page.evaluate(
        () =>
          document
            .getElementById("section-typography")
            ?.closest("section")
            ?.contains(document.activeElement) ?? false,
      ),
    ).toBe(true);
  });

  test("below 48em the Preview bar's Save saves, and the card appears (R5.5)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(themeCreatorPath);
    // Dark enough for white text at 4.5:1, so Save has no contrast warning to show.
    await setHex(page, "Action", "#1a5f7a");

    await page
      .getByRole("button", { name: "Show preview" })
      .locator("..")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await nameAndSave(page, "Harbor");

    await expect(page.getByText("Saved Harbor")).toBeAttached();
    await expect(card(page, "Harbor")).toBeVisible();
    await expect(card(page, "Harbor").getByText("Editing", { exact: true })).toBeVisible();
  });

  test("one saved theme's card keeps to one of three columns, not the whole row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(themeCreatorPath);
    await saveThemes(page, 1);

    const list = await library(page).getByRole("list").boundingBox();
    const item = await card(page, "Theme 1").boundingBox();
    if (!list || !item) throw new Error("no card list");
    expect(item.width).toBeLessThanOrEqual(list.width / 3);
  });

  test("Use on site from a card restyles the page and marks the card In use (R2.7)", async ({
    page,
  }) => {
    await page.goto(themeCreatorPath);
    await saveThemes(page, 1);

    await card(page, "Theme 1").getByRole("button", { name: "More actions for Theme 1" }).click();
    await page.getByRole("menuitem", { name: "Use on site" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-custom-theme", /^[a-z0-9]{8}$/);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCSS(
      "background-color",
      "rgb(30, 107, 69)",
    );
    await expect(card(page, "Theme 1").getByText("In use")).toBeVisible();
    await expect(page.getByText("Now using Theme 1 across the site")).toBeAttached();
  });

  test("a card's sample adds no Tab stops: Tab goes New theme, Edit, More, then the toolbar (R2.11)", async ({
    page,
    browserName,
  }) => {
    await page.goto(themeCreatorPath);
    await saveThemes(page, 1);
    const newTheme = page.getByRole("button", { name: "New theme" });
    await newTheme.focus();

    await page.keyboard.press(tabKey(browserName));
    await expect(page.getByRole("button", { name: "Edit Theme 1" })).toBeFocused();
    await page.keyboard.press(tabKey(browserName));
    await expect(page.getByRole("button", { name: "More actions for Theme 1" })).toBeFocused();
    await page.keyboard.press(tabKey(browserName));
    await expect(page.getByRole("button", { name: "Discard changes" })).toBeFocused();
  });

  for (const theme of themes) {
    for (const count of [0, 1, 3]) {
      test(`has no axe violations in ${theme} with ${String(count)} saved themes (R6.5)`, async ({
        page,
      }) => {
        await storeTheme(page, theme);
        await page.goto(themeCreatorPath);
        await saveThemes(page, count);
        await expect(library(page).getByText(`${String(count)} of 3 saved`)).toBeVisible();
        await expect(library(page).getByRole("listitem")).toHaveCount(count);

        await expectNoAxeViolations(page);
      });
    }
  }

  test("has no axe violations with three saved themes, one in use (R6.5)", async ({ page }) => {
    await page.goto(themeCreatorPath);
    await saveThemes(page, 3);
    await card(page, "Theme 2").getByRole("button", { name: "More actions for Theme 2" }).click();
    await page.getByRole("menuitem", { name: "Use on site" }).click();
    await expect(card(page, "Theme 2").getByText("In use")).toBeVisible();

    await expectNoAxeViolations(page);
  });
});

test("Escape on a dialog's Close tooltip hides the tooltip and leaves the dialog open (theme-creator R12.4)", async ({
  page,
  browserName,
}) => {
  await page.goto("/design-system/components/dialog");
  await page.getByRole("button", { name: "Delete theme" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Ocean”?" });
  await expect(dialog.getByRole("button", { name: "Keep theme" })).toBeFocused();

  // Back from the first action to Close, by keyboard: its name tooltip shows.
  await page.keyboard.press(tabKey(browserName, true));
  const close = dialog.getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();
  // A name tooltip repeats the name, so it's hidden from assistive technology (refinement R14.12).
  const tooltip = close.locator("xpath=following-sibling::span[@popover][1]");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Close");

  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
