import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  elkPhoto as elk,
  fallsPhoto as falls,
  missingImageSrc,
} from "../../web/src/design-system/components/showcases/figure-photos.ts";
import { example, probe, storeTheme, themes, tokenColor } from "./support.ts";

/** The Figure page's examples panel: past the main example, which shows the elk photo too. */
const figures = (page: Page) => page.getByRole("group", { name: "Figure examples", exact: true });

/** Scrolls a lazy image into view and waits until the browser has finished with it, loaded or not. */
async function settle(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete)).toBe(true);
}

const box = (locator: Locator) =>
  locator.evaluate((node) => {
    const { top, bottom, width, height } = node.getBoundingClientRect();
    return { top, bottom, width, height };
  });

test.describe("Figure (refinement R18)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("figure"));
  });

  for (const theme of themes) {
    test(`draws a bare image with token corners and the caption right below it, in ${theme} (R18.5, R18.6)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      // Already on this URL, so only a reload runs the stored theme's init script.
      await page.reload();
      const scope = figures(page);
      const informative = example(scope, "Informative with a caption");
      const figure = informative.locator("figure");
      const image = figure.getByRole("img", { name: elk.alt });
      const caption = figure.locator("figcaption");
      await settle(image);

      const radius = await probe(scope, "border-top-left-radius", "var(--radius-surface)");
      for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
        await expect(image).toHaveCSS(`border-${corner}-radius`, radius);
      }
      for (const side of ["top", "right", "bottom", "left"]) {
        await expect(figure).toHaveCSS(`margin-${side}`, "0px");
        for (const element of [figure, image]) {
          await expect(element).toHaveCSS(`padding-${side}`, "0px");
          await expect(element).toHaveCSS(`border-${side}-width`, "0px");
        }
      }
      for (const element of [figure, image]) {
        await expect(element).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      }
      await expect(caption).toHaveCSS("color", tokenColor("color.text.muted", theme));

      const gap = Number.parseFloat(await probe(scope, "padding-top", "var(--space-stack-xs)"));
      const [imageBox, captionBox] = [await box(image), await box(caption)];
      expect(gap).toBeGreaterThan(0);
      expect(captionBox.top - imageBox.bottom).toBeCloseTo(gap, 0);
    });
  }

  test("names each captioned figure by its caption (R18.6)", async ({ page }) => {
    const scope = figures(page);

    await expect(scope.getByRole("figure", { name: elk.caption })).toHaveCount(2);
    await expect(scope.getByRole("figure", { name: falls.caption })).toHaveCount(1);
    await expect(scope.getByRole("figure", { name: "This file is missing." })).toHaveCount(1);
  });

  test("caps a tall image at 80% of the viewport height, keeping its ratio, with the figure as wide as the image (R18.5)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    const figure = example(figures(page), "Tall image").locator("figure");
    const image = figure.getByRole("img", { name: falls.alt });
    await settle(image);

    const [imageBox, figureBox, captionBox] = [
      await box(image),
      await box(figure),
      await box(figure.locator("figcaption")),
    ];
    expect(imageBox.height).toBeLessThanOrEqual(600 * 0.8 + 1);
    expect(imageBox.height).toBeGreaterThan(600 * 0.8 - 2);
    expect(imageBox.width / imageBox.height).toBeCloseTo(falls.width / falls.height, 2);
    expect(Math.abs(figureBox.width - imageBox.width)).toBeLessThanOrEqual(1);
    expect(captionBox.width).toBeLessThanOrEqual(imageBox.width + 1);
    // The caption is long enough to wrap at the image's width.
    const lineHeight = await figure
      .locator("figcaption")
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).lineHeight));
    expect(captionBox.height).toBeGreaterThan(lineHeight * 1.5);
  });

  test("fits a 320px window with no sideways page scroll, loading a srcset file (R18.5)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.reload();
    const informative = example(figures(page), "Informative with a caption");
    const image = informative.getByRole("img", { name: elk.alt });
    await settle(image);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect((await box(image)).width).toBeLessThanOrEqual((await box(informative)).width);
    const { currentSrc, naturalWidth } = await image.evaluate((node: HTMLImageElement) => ({
      currentSrc: node.currentSrc,
      naturalWidth: node.naturalWidth,
    }));
    // One of the srcset's three widths, as Vite names the hashed files.
    expect(new URL(currentSrc).pathname).toMatch(
      /^\/assets\/bull-elk-(640|1280|1920)-[\w-]{8}\.jpg$/,
    );
    expect(naturalWidth).toBeGreaterThan(0);

    // A failed image is a plain box at its width attribute; it still mustn't widen the page.
    const failed = example(figures(page), "Failed to load").getByRole("img", { name: elk.alt });
    await settle(failed);
    expect(await failed.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("never upscales an image past its width attribute, and the figure stops there (R18.5)", async ({
    page,
  }) => {
    const figure = example(figures(page), "Informative with a caption").locator("figure");
    const image = figure.getByRole("img", { name: elk.alt });
    await settle(image);
    // A narrower intrinsic size in a wide panel; set and restored in the same task, so React never sees it.
    const sizes = await image.evaluate((node: HTMLImageElement) => {
      const figureNode = node.parentElement;
      node.setAttribute("width", "300");
      node.setAttribute("height", "200");
      figureNode?.style.setProperty("--_ratio", "300 / 200");
      const result = {
        image: node.getBoundingClientRect().width,
        figure: figureNode?.getBoundingClientRect().width ?? 0,
        panel: figureNode?.parentElement?.getBoundingClientRect().width ?? 0,
      };
      node.setAttribute("width", "1920");
      node.setAttribute("height", "1280");
      figureNode?.style.setProperty("--_ratio", "1920 / 1280");
      return result;
    });
    expect(sizes.panel).toBeGreaterThan(300);
    expect(sizes.image).toBeCloseTo(300, 0);
    expect(sizes.figure).toBeCloseTo(300, 0);
  });

  test("serves the photos as image/jpeg (R18.8)", async ({ page }) => {
    const src = await example(figures(page), "Informative with a caption")
      .getByRole("img", { name: elk.alt })
      .getAttribute("src");
    expect(src).not.toBeNull();
    const response = await page.request.get(src ?? "");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
  });

  test("keeps a failed image's alt text as its name (R18.10)", async ({ page }) => {
    const image = example(figures(page), "Failed to load").getByRole("img", { name: elk.alt });
    await settle(image);

    expect(await image.getAttribute("src")).toBe(missingImageSrc);
    expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(0);
  });
});

// Its own describe, so no earlier visit has put the photos in the memory cache, where a held
// route never sees them.
test.describe("Figure before its image loads (refinement R18.3)", () => {
  test("reserves the image's box before it loads, so the caption doesn't move (R18.3)", async ({
    page,
  }) => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested = () => {};
    const request = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route(/\/assets\/bull-elk-\d+-[\w-]+\.jpg$/, async (route) => {
      requested();
      await held;
      await route.continue();
    });
    // The held images are in view at #figure, and images in view hold back the load event.
    await page.goto(componentPath("figure"), { waitUntil: "domcontentloaded" });
    const figure = example(figures(page), "Informative with a caption").locator("figure");
    const image = figure.getByRole("img", { name: elk.alt });
    await image.scrollIntoViewIfNeeded();
    // The lazy image's file is requested and held, so it hasn't loaded yet.
    await request;
    expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(0);
    const before = await box(image);
    const captionBefore = (await box(figure.locator("figcaption"))).top - before.top;
    expect(before.height).toBeGreaterThan(0);
    expect(before.width / before.height).toBeCloseTo(elk.width / elk.height, 1);

    release();
    await settle(image);
    expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
    const after = await box(image);
    expect(after.height).toBeCloseTo(before.height, 0);
    expect((await box(figure.locator("figcaption"))).top - after.top).toBeCloseTo(captionBefore, 0);
  });
});
