import { expect, test, type Page } from "@playwright/test";
import { example, probe, section, storeTheme, tabKey, themes, tokenColor } from "./support.ts";

const separators = (page: Page) => section(page, "Separator");

/** The decorative separators (empty hidden divs) of an example in the Separator section. */
const decorativeIn = (page: Page, title: string) =>
  example(separators(page), title).locator('div[aria-hidden="true"]:empty');

test.describe("Separator (refinement R17)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lab/components#separator");
  });

  for (const theme of themes) {
    test(`draws one border side per orientation, variant and thickness, with no margin, in ${theme} (R17.4, R17.5)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      // Already on this URL, so only a reload runs the stored theme's init script.
      await page.reload();
      const scope = separators(page);
      // A probe without a border style computes its border width as 0, so read the length as padding.
      const thickness = await probe(scope, "padding-top", "var(--effect-border-width)");
      const subtle = tokenColor("color.border.default", theme);

      // Horizontal: the block-start side only, as wide as its Stack, no margin.
      const rule = example(scope, "Horizontal").getByRole("separator");
      await expect(rule).toHaveCSS("border-top-width", thickness);
      await expect(rule).toHaveCSS("border-top-style", "solid");
      await expect(rule).toHaveCSS("border-top-color", subtle);
      for (const side of ["bottom", "left", "right"]) {
        await expect(rule).toHaveCSS(`border-${side}-width`, "0px");
      }
      for (const side of ["top", "right", "bottom", "left"]) {
        await expect(rule).toHaveCSS(`margin-${side}`, "0px");
      }
      // Still as wide as its Stack when the Stack centers its children (align-self: stretch).
      // Set and restored in the same task, so React never sees it.
      const [width, stackWidth, height] = await rule.evaluate((node) => {
        const stack = node.parentElement;
        stack?.style.setProperty("align-items", "center");
        const sizes = [
          node.getBoundingClientRect().width,
          stack?.getBoundingClientRect().width ?? 0,
          node.getBoundingClientRect().height,
        ] as const;
        stack?.style.removeProperty("align-items");
        return sizes;
      });
      expect(stackWidth).toBeGreaterThan(0);
      expect(width).toBeCloseTo(stackWidth, 1);
      expect(height).toBeCloseTo(Number.parseFloat(thickness), 1);

      // Vertical: the inline-start side only, filling the byline row despite its align="center".
      const lines = decorativeIn(page, "Vertical");
      await expect(lines).toHaveCount(2);
      for (const line of await lines.all()) {
        await expect(line).toHaveCSS("border-left-width", thickness);
        await expect(line).toHaveCSS("border-left-style", "solid");
        await expect(line).toHaveCSS("border-left-color", subtle);
        await expect(line).toHaveCSS("border-top-width", "0px");
        await expect(line).toHaveCSS("margin-left", "0px");
        // The row made taller than one line, so only stretching fills it; restored in the same task.
        const [lineHeight, rowHeight, lineWidth, textHeight] = await line.evaluate((node) => {
          const row = node.parentElement;
          row?.style.setProperty("min-block-size", "3lh");
          const sizes = [
            node.getBoundingClientRect().height,
            row?.getBoundingClientRect().height ?? 0,
            node.getBoundingClientRect().width,
            Number.parseFloat(getComputedStyle(node).lineHeight),
          ] as const;
          row?.style.removeProperty("min-block-size");
          return sizes;
        });
        expect(rowHeight).toBeGreaterThan(textHeight * 2);
        expect(lineHeight).toBeCloseTo(rowHeight, 1);
        expect(lineWidth).toBeCloseTo(Number.parseFloat(thickness), 1);
      }

      // Variants: subtle, then strong.
      const variants = decorativeIn(page, "Variants");
      await expect(variants.nth(0)).toHaveCSS("border-top-color", subtle);
      await expect(variants.nth(1)).toHaveCSS(
        "border-top-color",
        tokenColor("color.border.strong", theme),
      );

      // Thickness: thin is the border width, thick is its own token, both as one border side.
      const thick = await probe(scope, "padding-top", "var(--effect-border-width-thick)");
      expect(Number.parseFloat(thick)).toBeGreaterThan(Number.parseFloat(thickness));
      const thicknesses = decorativeIn(page, "Thickness");
      await expect(thicknesses.nth(0)).toHaveCSS("border-top-width", thickness);
      await expect(thicknesses.nth(1)).toHaveCSS("border-top-width", thick);
      await expect(thicknesses.nth(1)).toHaveCSS("border-bottom-width", "0px");
      expect(
        await thicknesses.nth(1).evaluate((node) => node.getBoundingClientRect().height),
      ).toBeCloseTo(Number.parseFloat(thick), 1);
    });
  }

  test("a vertical separator in block flow is at least one line tall (R17.4)", async ({ page }) => {
    const line = decorativeIn(page, "Vertical").first();
    await expect(line).toBeVisible();
    // Copied into a plain block and removed in the same task, so React never sees it.
    const [height, lineHeight] = await line.evaluate((node) => {
      const block = document.createElement("div");
      const copy = node.cloneNode() as HTMLElement;
      block.append(copy);
      node.closest("section")?.append(block);
      const result = [
        copy.getBoundingClientRect().height,
        Number.parseFloat(getComputedStyle(copy).lineHeight),
      ] as const;
      block.remove();
      return result;
    });

    expect(lineHeight).toBeGreaterThan(0);
    expect(height).toBeGreaterThanOrEqual(lineHeight - 0.5);
  });

  test("Tab never stops on a separator (R17.2)", async ({ page, browserName }) => {
    await page.getByRole("button", { name: /\(Separator preview\)$/ }).focus();
    const stops: string[] = [];
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press(tabKey(browserName));
      stops.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          return active?.matches('hr, [role="separator"], div[aria-hidden="true"]:empty')
            ? "separator"
            : (active?.tagName ?? "");
        }),
      );
    }

    expect(stops).not.toContain("separator");
  });

  test("keeps the lines visible under forced colors (R17.7)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const scope = separators(page);
    const background = await scope.evaluate((node) => getComputedStyle(node).backgroundColor);

    const lines = [
      { line: example(scope, "Horizontal").getByRole("separator"), side: "top" },
      { line: decorativeIn(page, "Vertical").first(), side: "left" },
      { line: decorativeIn(page, "Variants").nth(1), side: "top" },
    ];
    for (const { line, side } of lines) {
      const border = await line.evaluate((node, edge) => {
        const style = getComputedStyle(node);
        return {
          style: style.getPropertyValue(`border-${edge}-style`),
          width: Number.parseFloat(style.getPropertyValue(`border-${edge}-width`)),
          color: style.getPropertyValue(`border-${edge}-color`),
        };
      }, side);
      expect(border.style).toBe("solid");
      expect(border.width).toBeGreaterThan(0);
      expect(border.color).not.toBe("rgba(0, 0, 0, 0)");
      expect(border.color).not.toBe(background);
    }
  });
});
