import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator } from "@playwright/test";
import { example, main, probe } from "./support.ts";

/** Width, its container's width, overflow and the number of lines its text runs over. */
const fit = (element: Locator) =>
  element.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return {
      width: node.getBoundingClientRect().width,
      container: node.parentElement?.getBoundingClientRect().width ?? 0,
      overflow: node.scrollWidth - node.clientWidth,
      lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size,
    };
  });

/** A badge's computed corner radius, height, line height and border width, in px. */
const corners = (element: Locator) =>
  element.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      radius: Number.parseFloat(style.borderTopLeftRadius),
      height: node.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
      border: Number.parseFloat(style.borderTopWidth),
    };
  });

/** The badge in an example whose text is exactly `text`. */
const badge = (scope: Locator, text: string) => scope.getByText(text, { exact: true });

const px = async (scope: Locator, value: string) =>
  Number.parseFloat(await probe(scope, "padding-inline-start", value));

test.describe("Badge (refinement R9)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("badge"));
  });

  test("takes its line height and weight from its own tokens, even inside strong and a heading (R9.1)", async ({
    page,
  }) => {
    const scope = example(main(page), "In running text, with inline markup");
    const live = badge(scope, "Live");
    const lineHeight = await probe(live, "line-height", "var(--component-badge-line-height)");
    const fontWeight = await probe(live, "font-weight", "var(--component-badge-font-weight)");

    const inside = await live.evaluate((element) =>
      ["strong", "h4"].map((tag) => {
        const wrapper = document.createElement(tag);
        wrapper.append(element.cloneNode(true));
        element.parentElement?.append(wrapper);
        const style = getComputedStyle(wrapper.firstElementChild as Element);
        const computed = { lineHeight: style.lineHeight, fontWeight: style.fontWeight };
        wrapper.remove();
        return computed;
      }),
    );
    for (const computed of inside) {
      expect(computed).toEqual({ lineHeight, fontWeight });
    }
  });

  test("keeps the spaces around inline children (R9.2)", async ({ page }) => {
    const built = example(main(page), "In running text, with inline markup").getByText(
      "Built with",
    );
    await expect(built).toHaveCSS("display", "inline-block");

    const { gap, space } = await built.evaluate((element) => {
      const text = element.firstChild;
      const em = element.querySelector("em");
      if (!(text instanceof Text) || em === null) throw new Error("unexpected badge content");
      const word = document.createRange();
      const end = text.data.trimEnd().length;
      word.setStart(text, end - "with".length);
      word.setEnd(text, end);
      const probe = document.createElement("span");
      probe.textContent = " ";
      element.append(probe);
      const space = probe.getBoundingClientRect().width;
      probe.remove();
      return { gap: em.getBoundingClientRect().left - word.getBoundingClientRect().right, space };
    });
    expect(space).toBeGreaterThan(0);
    expect(gap).toBeGreaterThanOrEqual(space - 1);
  });

  test("wraps inside a narrow container instead of overflowing (R9.3)", async ({ page }) => {
    const long = badge(
      example(main(page), "Wraps instead of overflowing"),
      "Infrastructure as code",
    );

    const word = badge(example(main(page), "Wraps instead of overflowing"), "Internationalization");

    for (const element of [long, word]) {
      const { width, container, overflow, lines } = await fit(element);
      expect(width).toBeLessThanOrEqual(container + 0.5);
      expect(overflow).toBe(0);
      expect(lines).toBe(2);
    }
  });

  test("causes no horizontal scroll at 320px (R9.3)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const badges = main(page);
    await badges.scrollIntoViewIfNeeded();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    for (const element of await badges
      .locator('[role="group"] > h3:first-child + div')
      .locator("span, li")
      .all()) {
      expect(await element.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
    }
    // Badges that fit move to the next line whole, in a row and in a wrapping Stack.
    for (const title of ["Variants", "A tech stack, as a list"]) {
      for (const element of await example(badges, title).locator("span, li").all()) {
        expect((await fit(element)).lines).toBe(1);
      }
    }
  });

  test("is a pill with room at its ends, at both sizes (R9.4, R9.5)", async ({ page }) => {
    const sizes = example(main(page), "Sizes");
    const padding = await probe(sizes, "padding-inline-start", "var(--space-inline-sm)");

    for (const text of ["Small", "Medium"]) {
      const element = badge(sizes, text);
      const { radius, height } = await corners(element);
      expect(radius).toBeGreaterThanOrEqual(height / 2 - 0.5);
      await expect(element).toHaveCSS("padding-inline-start", padding);
      await expect(element).toHaveCSS("padding-inline-end", padding);
    }
  });

  test("keeps a wrapped badge's corners one line round, so no letter is cut (R9.4)", async ({
    page,
  }) => {
    const wraps = example(main(page), "Wraps instead of overflowing");

    for (const text of ["Infrastructure as code", "Internationalization"]) {
      const { radius, height, lineHeight, border } = await corners(badge(wraps, text));
      expect(Math.abs(radius - (lineHeight / 2 + border))).toBeLessThanOrEqual(0.5);
      expect(radius).toBeLessThan(height / 2);
    }
  });

  test("takes each variant's colors from its own tokens (R9.6)", async ({ page }) => {
    const variants = example(main(page), "Variants");

    for (const [variant, text] of [
      ["neutral", "Neutral"],
      ["accent", "Accent"],
      ["accent-2", "Accent 2"],
      ["success", "Live"],
      ["warning", "Beta"],
      ["error", "Deprecated"],
    ] as const) {
      const element = badge(variants, text);
      const token = (part: string) => `var(--component-badge-${variant}-${part})`;
      await expect(element).toHaveCSS(
        "background-color",
        await probe(variants, "background-color", token("background")),
      );
      await expect(element).toHaveCSS("color", await probe(variants, "color", token("text")));
      await expect(element).toHaveCSS(
        "border-top-color",
        await probe(variants, "border-top-color", token("border")),
      );
    }
  });

  test("spaces the icon from the text by the gap token (R9.9)", async ({ page }) => {
    const icons = example(main(page), "With an icon");
    const gap = await px(icons, "var(--space-inline-xs)");
    expect(gap).toBeGreaterThan(0);

    for (const text of ["Live", "Open source"]) {
      const distance = await badge(icons, text).evaluate((element) => {
        const icon = element.querySelector("svg");
        const label = element.lastChild;
        if (icon === null || !(label instanceof Text)) throw new Error("unexpected badge content");
        const range = document.createRange();
        range.selectNodeContents(label);
        return range.getBoundingClientRect().left - icon.getBoundingClientRect().right;
      });
      expect(Math.abs(distance - gap)).toBeLessThanOrEqual(1);
    }
  });
});
