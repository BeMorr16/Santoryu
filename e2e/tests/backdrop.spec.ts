import { expect, test, type Page } from "@playwright/test";
import { chooseInMenu, storeTheme, themes, tokenColor } from "./support.ts";

/** Home and the 404 draw the sphere; every Design System page has the frame glow (R1.3). */
const strikingPages = ["/", "/nope"];
const quietPage = "/design-system";

const sphere = (page: Page) => page.locator('canvas[aria-hidden="true"]');
const frameGlow = (page: Page) => page.locator('div[aria-hidden="true"][class*="_quiet_"]');
const switcher = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Theme: / });

/** Waits until the sphere has drawn its first frame and faded in (R2.9). */
async function sphereShown(page: Page) {
  await expect(sphere(page)).toHaveCSS("opacity", "1");
}

/**
 * What the sphere has painted: how many pixels, a checksum of them, and the mean color of its
 * solid pixels (the nearer dots).
 */
async function sample(page: Page) {
  return sphere(page).evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2D context");
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    let checksum = 0;
    let solid = 0;
    let lightness = 0;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] ?? 0;
      if (alpha === 0) continue;
      painted++;
      checksum = (checksum * 31 + index + alpha + (data[index] ?? 0) * 7) % 2_147_483_647;
      if (alpha > 128) {
        solid++;
        lightness += (data[index] ?? 0) + (data[index + 1] ?? 0) + (data[index + 2] ?? 0);
      }
    }
    return { painted, checksum, lightness: solid ? lightness / solid / 3 : Number.NaN };
  });
}

/** Layout shifts whose moved nodes include a backdrop layer, from the page's start (R5.6). */
async function watchBackdropShifts(page: Page) {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    Object.assign(window, { backdropShifts: shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        sources?: { node?: Node | null }[];
      })[]) {
        const fromBackdrop = (entry.sources ?? []).some(
          ({ node }) =>
            node instanceof Element &&
            (node.localName === "canvas" || (node.getAttribute("class") ?? "").includes("_quiet_")),
        );
        if (fromBackdrop) shifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  return () =>
    page.evaluate(() => (window as unknown as { backdropShifts: number[] }).backdropShifts);
}

for (const path of strikingPages) {
  test.describe(`${path} (striking)`, () => {
    test("fixes the sphere behind the content, where it never takes the pointer (R2.1, R2.7)", async ({
      page,
    }) => {
      await page.goto(path);
      await sphereShown(page);

      await expect(sphere(page)).toHaveCSS("position", "fixed");
      await expect(sphere(page)).toHaveCSS("z-index", "-1");
      await expect(sphere(page)).toHaveCSS("pointer-events", "none");
      const hit = await page.evaluate(() => {
        const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return element?.localName;
      });
      expect(hit).not.toBe("canvas");
      await expect(frameGlow(page)).toHaveCount(0);
    });

    for (const theme of themes) {
      test(`draws the sphere and keeps it turning in ${theme} (R2.1, R2.4)`, async ({ page }) => {
        await storeTheme(page, theme);
        await page.goto(path);
        await sphereShown(page);

        const first = await sample(page);
        await page.waitForTimeout(500);
        const second = await sample(page);

        expect(first.painted).toBeGreaterThan(0);
        expect(second.checksum).not.toBe(first.checksum);
      });
    }

    test("keeps the header's glass blurring the sphere (R6.5)", async ({ page }) => {
      await page.goto(path);
      await sphereShown(page);

      const filter = await page
        .getByRole("banner")
        .evaluate((header) => getComputedStyle(header).backdropFilter);
      expect(filter).toMatch(/^blur\(/);
    });
  });
}

test("draws no grid on the page any more (R1.5)", async ({ page }) => {
  for (const path of [...strikingPages, quietPage]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveCSS("background-image", "none");
  }
});

test.describe("pause toggle (R6.7)", () => {
  const toggle = (page: Page) =>
    page.getByRole("banner").getByRole("button", { name: "Pause background animation" });

  test("stops the sphere where it is, remembers it, and starts it again", async ({ page }) => {
    await page.goto("/");
    await sphereShown(page);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    const paused = await sample(page);
    await page.waitForTimeout(500);
    expect(await sample(page)).toEqual(paused);

    await page.reload();
    await sphereShown(page);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    const reloaded = await sample(page);
    await page.waitForTimeout(500);
    expect(await sample(page)).toEqual(reloaded);

    await toggle(page).press("Enter");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(500);
    expect((await sample(page)).checksum).not.toBe(reloaded.checksum);
  });

  test("isn't offered where there's no sphere", async ({ page }) => {
    await page.goto(quietPage);

    await expect(page.getByRole("banner").getByRole("button", { name: /^Theme: / })).toBeVisible();
    await expect(toggle(page)).toHaveCount(0);
  });
});

test("draws one still frame, shown without a fade, under reduced motion (R5.1, R2.9)", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await sphereShown(page);

  await expect(sphere(page)).toHaveCSS("transition-duration", "0s");
  const first = await sample(page);
  await page.mouse.move(10, 10);
  await page.waitForTimeout(500);
  const second = await sample(page);

  expect(first.painted).toBeGreaterThan(0);
  expect(second).toEqual(first);
});

test("redraws the sphere in the new theme's colors when the theme changes (R3.3)", async ({
  page,
}) => {
  await storeTheme(page, "light");
  await page.goto("/");
  await sphereShown(page);
  const light = await sample(page);

  await chooseInMenu(page, switcher(page), "Dark");
  await expect(switcher(page)).toHaveAccessibleName("Theme: Dark");
  await page.waitForTimeout(100);
  const dark = await sample(page);

  // Light draws ocean-ink dots on cream; dark draws near-white and bright cyan dots.
  expect(dark.lightness).toBeGreaterThan(light.lightness + 60);
});

for (const theme of themes) {
  test(`${quietPage} has the frame glow in the ${theme} frame color, and no sphere (R4.1, R4.4)`, async ({
    page,
  }) => {
    await storeTheme(page, theme);
    await page.goto(quietPage);

    await expect(frameGlow(page)).toHaveCount(1);
    await expect(frameGlow(page)).toHaveCSS("position", "fixed");
    await expect(frameGlow(page)).toHaveCSS("z-index", "-1");
    const shadow = await frameGlow(page).evaluate((element) => getComputedStyle(element).boxShadow);
    // The frame color is translucent; tokenColor gives its opaque channels.
    const channels = tokenColor("color.backdrop.frame", theme).slice("rgb(".length, -1);
    expect(shadow).toContain(`rgba(${channels},`);
    expect(shadow).toContain("inset");
    await expect(sphere(page)).toHaveCount(0);
  });
}

test("swaps the backdrops on client-side navigation, with no errors (R1.4)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await sphereShown(page);

  await page.getByRole("banner").getByRole("link", { name: "Design System" }).click();
  await expect(page).toHaveURL(quietPage);
  await expect(frameGlow(page)).toHaveCount(1);
  await expect(sphere(page)).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL("/");
  await sphereShown(page);
  await expect(frameGlow(page)).toHaveCount(0);
  const drawn = await sample(page);
  expect(drawn.painted).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test.describe("hidden where the backdrop would get in the way (R6.2, R6.3)", () => {
  for (const [label, media] of [
    ["forced colors", { forcedColors: "active" }],
    ["print", { media: "print" }],
  ] as const) {
    test(`hides both backdrops for ${label}`, async ({ page }) => {
      await page.emulateMedia(media);

      await page.goto("/");
      await expect(sphere(page)).toHaveCSS("display", "none");
      await page.goto(quietPage);
      await expect(frameGlow(page)).toHaveCSS("display", "none");
    });
  }
});

test("adds no layout shift on load, resize or navigation (R5.6)", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit doesn't report layout-shift entries.");
  const shifts = await watchBackdropShifts(page);
  await page.goto("/");
  await sphereShown(page);

  await page.setViewportSize({ width: 600, height: 800 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("banner").getByRole("link", { name: "Design System" }).click();
  await expect(frameGlow(page)).toHaveCount(1);
  await page.goBack();
  await sphereShown(page);

  expect(await shifts()).toEqual([]);
});
