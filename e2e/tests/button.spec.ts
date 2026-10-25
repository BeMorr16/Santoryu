import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator } from "@playwright/test";
import { example, main } from "./support.ts";

/**
 * What `property: value` computes to inside `scope`, read from a probe element set through CSSOM
 * (allowed by the CSP). A token's custom property resolves in the scope's theme. With `forced`,
 * the probe opts out of forced colors, so a system color reads back as itself.
 */
async function probe(
  scope: Locator,
  property: "background-color" | "color" | "border-top-color",
  value: string,
  forced = false,
) {
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

async function size(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("no box");
  return box;
}

test.describe("Button (refinement R3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("button"));
  });

  test("renders icon-only buttons square: 32×32 at sm, 40×40 at md (R3.5)", async ({ page }) => {
    const tiles = example(main(page), "Icon-only").getByRole("listitem");

    await expect(tiles).toHaveCount(4);
    for (const tile of await tiles.all()) {
      const caption = (await tile.locator("code").textContent()) ?? "";
      const expected = caption.startsWith("sm") ? 32 : 40;
      const { width, height } = await size(tile.getByRole("button"));
      expect([width, height], caption).toEqual([expected, expected]);
    }
  });

  test("keeps single-line buttons at their height token, and pads and centers a wrapped label (R3.9)", async ({
    page,
  }) => {
    const button = main(page);
    for (const variant of await example(button, "Variants").getByRole("button").all()) {
      expect((await size(variant)).height).toBe(40);
    }
    const sizes = example(button, "Sizes");
    expect((await size(sizes.getByRole("button", { name: "Small" }))).height).toBe(32);
    expect((await size(sizes.getByRole("button", { name: "Medium" }))).height).toBe(40);

    const long = example(button, "Long label").getByRole("button");
    expect((await size(long)).height).toBeGreaterThan(40);
    await expect(long).toHaveCSS("text-align", "center");
    const inset = await long.evaluate((element) => {
      const range = document.createRange();
      const text = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (text === undefined) throw new Error("no label text");
      range.selectNodeContents(text);
      const label = range.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const padding = Number.parseFloat(getComputedStyle(element).paddingBlockStart);
      return { top: label.top - box.top, bottom: box.bottom - label.bottom, padding };
    });
    expect(inset.padding).toBeGreaterThan(0);
    expect(inset.top).toBeGreaterThanOrEqual(inset.padding);
    expect(inset.bottom).toBeGreaterThanOrEqual(inset.padding);
  });

  test("styles pressed toggles from their variant's pressed tokens (R3.1, palette-expansion R3.1)", async ({
    page,
  }) => {
    const toggles = example(main(page), "Toggles");
    const grid = toggles.getByRole("button", { name: "Show grid" });
    const wrap = toggles.getByRole("button", { name: "Wrap lines" });
    const notify = toggles.getByRole("button", { name: "Notify me" });
    const expectPressedLook = async (
      toggle: Locator,
      variant: "primary" | "secondary" | "ghost",
    ) => {
      const token = (part: string) => `var(--component-button-${variant}-pressed-${part})`;
      await expect(toggle).toHaveCSS(
        "background-color",
        await probe(toggles, "background-color", token("background")),
      );
      await expect(toggle).toHaveCSS("color", await probe(toggles, "color", token("text")));
      await expect(toggle).toHaveCSS(
        "border-top-color",
        await probe(toggles, "border-top-color", token("border")),
      );
    };

    await expect(grid).toHaveAttribute("aria-pressed", "true");
    await expectPressedLook(grid, "secondary");
    await expect(notify).toHaveAttribute("aria-pressed", "true");
    await expectPressedLook(notify, "primary");

    await wrap.click();
    await page.mouse.move(0, 0);

    await expect(wrap).toHaveAttribute("aria-pressed", "true");
    await expectPressedLook(wrap, "ghost");
  });

  test("uses the variant's background-active token while pressing (R3.3)", async ({ page }) => {
    const secondary = example(main(page), "Variants").getByRole("button", {
      name: "Secondary",
    });
    // background-active starts equal to hover, so a distinct value proves :active, not :hover.
    await secondary.evaluate((element) => {
      element.style.setProperty("--component-button-secondary-background-active", "rgb(1, 2, 3)");
    });

    await secondary.hover();
    await page.mouse.down();

    await expect(secondary).toHaveCSS("background-color", "rgb(1, 2, 3)");

    await page.mouse.up();
  });

  test("uses pressed.background-hover while pressing a pressed toggle (R3.3, palette-expansion R3.2)", async ({
    page,
  }) => {
    const toggles = example(main(page), "Toggles");
    for (const [name, variant] of [
      ["Show grid", "secondary"],
      ["Notify me", "primary"],
    ] as const) {
      const toggle = toggles.getByRole("button", { name });
      await toggle.evaluate((element, variant) => {
        element.style.setProperty(
          `--component-button-${variant}-pressed-background-hover`,
          "rgb(4, 5, 6)",
        );
      }, variant);

      await toggle.hover();
      await page.mouse.down();

      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toHaveCSS("background-color", "rgb(4, 5, 6)");

      await page.mouse.up();
    }
  });

  test("shows the disabled look on a disabled pressed toggle (palette-expansion R3.4)", async ({
    page,
  }) => {
    const toggles = example(main(page), "Toggles");
    const token = (part: string) => `var(--component-button-disabled-${part})`;
    for (const name of ["Show grid", "Notify me"]) {
      const toggle = toggles.getByRole("button", { name });
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await toggle.evaluate((element) => {
        element.setAttribute("aria-disabled", "true");
      });

      await expect(toggle).toHaveCSS(
        "background-color",
        await probe(toggles, "background-color", token("background")),
      );
      await expect(toggle).toHaveCSS("color", await probe(toggles, "color", token("text")));
      await expect(toggle).toHaveCSS(
        "border-top-color",
        await probe(toggles, "border-top-color", token("border")),
      );
    }
  });

  test("shows disabled in GrayText and pressed in Highlight, even on hover and press, under forced colors (R3.10, palette-expansion R3.3)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const button = main(page);

    const disabled = example(button, "Disabled (still focusable)").getByRole("button").first();
    const grayText = await probe(button, "color", "GrayText", true);
    await expect(disabled).toHaveCSS("color", grayText);
    await expect(disabled).toHaveCSS("border-top-color", grayText);

    const highlight = await probe(button, "background-color", "Highlight", true);
    const highlightText = await probe(button, "color", "HighlightText", true);
    for (const name of ["Show grid", "Notify me"]) {
      const toggle = example(button, "Toggles").getByRole("button", { name });
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toHaveCSS("background-color", highlight);
      await expect(toggle).toHaveCSS("color", highlightText);

      // Hover and :active outrank the pressed rule, so they must resolve to Highlight too.
      await toggle.hover();
      await expect(toggle).toHaveCSS("background-color", highlight);
      await page.mouse.down();
      await expect(toggle).toHaveCSS("background-color", highlight);
      await page.mouse.up();
    }
  });
});

test.describe("Button on a touch screen (refinement R3.4)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Touch emulation is Chromium-only.");
  test.use({ hasTouch: true, isMobile: true });

  test("leaves no hover color behind after a tap", async ({ page }) => {
    await page.goto(componentPath("button"));
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
    const variants = example(main(page), "Variants");
    const secondary = variants.getByRole("button", { name: "Secondary" });

    await secondary.tap();

    await expect(secondary).toHaveCSS(
      "background-color",
      await probe(variants, "background-color", "var(--component-button-secondary-background)"),
    );
  });
});
