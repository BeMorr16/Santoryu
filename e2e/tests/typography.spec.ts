import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator } from "@playwright/test";
import { example, main, probe } from "./support.ts";

/** What each Type scale item's text says, by variant (refinement R12.13). */
const scale = {
  display: "Display, 48px",
  h1: "Heading 1, 40px",
  h2: "Heading 2, 32px",
  h3: "Heading 3, 24px",
  h4: "Heading 4, 20px",
  h5: "Heading 5, 16px",
  h6: "Heading 6, 14px",
  lead: "Lead, 20px",
  body: "Body, 16px",
  small: "Small, 14px",
  label: "Label, 12px",
} as const;

const tones = {
  default: "Default",
  muted: "Muted",
  subtle: "Subtle",
  accent: "Accent",
  "accent-2": "Accent 2",
  success: "Success: saved",
  warning: "Warning: unsaved changes",
  error: "Error: the email is missing",
} as const;

/** CSS property → the component token suffix it reads, for the five-line variants (R12.4). */
const looks = {
  "font-family": "font-family",
  "font-size": "font-size",
  "font-weight": "font-weight",
  "line-height": "line-height",
  "letter-spacing": "tracking",
} as const;

/** The number of lines an element's text runs over. */
const lines = (element: Locator) =>
  element.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  });

test.describe("Typography (refinement R12)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("typography"));
  });

  test("gives each variant in the scale its five tokens' look (R12.4)", async ({ page }) => {
    const scope = example(main(page), "Type scale");

    for (const [variant, text] of Object.entries(scale)) {
      const item = scope.getByText(text, { exact: true });
      // Probed inside the item, so em tracking and unitless line heights resolve at its own size.
      for (const [property, token] of Object.entries(looks)) {
        await expect(item, `${variant} ${property}`).toHaveCSS(
          property,
          await probe(item, property, `var(--component-typography-${variant}-${token})`),
        );
      }
    }
    await expect(scope.getByText(scale.label, { exact: true })).toHaveCSS(
      "text-transform",
      "uppercase",
    );
  });

  test("gives code the code font at its parent's size (R12.4)", async ({ page }) => {
    const code = example(main(page), "Type scale").getByText("Code, inherits size", {
      exact: true,
    });

    await expect(code).toHaveCSS(
      "font-family",
      await probe(code, "font-family", "var(--component-typography-code-font-family)"),
    );
    const sizes = await code.evaluate((node) => ({
      own: getComputedStyle(node).fontSize,
      parent: node.parentElement ? getComputedStyle(node.parentElement).fontSize : "",
    }));
    expect(sizes.own).toBe(sizes.parent);
  });

  test("lets an inline element inherit its paragraph's size (R12.3)", async ({ page }) => {
    const strong = example(main(page), "Look from the element").getByText("strong text", {
      exact: true,
    });

    const sizes = await strong.evaluate((node) => ({
      own: getComputedStyle(node).fontSize,
      parent: node.parentElement ? getComputedStyle(node.parentElement).fontSize : "",
    }));
    expect(sizes.own).toBe(sizes.parent);
    await expect(strong.locator("xpath=..")).toHaveCSS(
      "font-size",
      await probe(strong, "font-size", "var(--component-typography-lead-font-size)"),
    );
  });

  test("takes each tone's color from its own token (R12.5)", async ({ page }) => {
    const scope = example(main(page), "Tones");

    for (const [tone, text] of Object.entries(tones)) {
      const item = scope.getByText(text, { exact: true });
      await expect(item, tone).toHaveCSS(
        "color",
        await probe(scope, "color", `var(--component-typography-tone-${tone}-color)`),
      );
    }
  });

  test("caps a measured paragraph at 65ch in its own font, and leaves the other alone (R12.6)", async ({
    page,
  }) => {
    const scope = example(main(page), "Measure");
    const capped = scope.getByText(/^With measure:/);
    const uncapped = scope.getByText(/^Without measure:/);

    const cap = Number.parseFloat(
      await probe(capped, "width", "var(--component-typography-measure)"),
    );
    expect(cap).toBeGreaterThan(0);
    const width = (element: Locator) =>
      element.evaluate((node) => node.getBoundingClientRect().width);
    expect(Math.abs((await width(capped)) - cap)).toBeLessThanOrEqual(1);
    expect(await width(uncapped)).toBeGreaterThan(cap + 1);
  });

  test("gives plain headings their sizes, no margin, and display tracking only on h1 and h2 (R12.8)", async ({
    page,
  }) => {
    const computed = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) throw new Error("no main");
      return ["h2", "h3", "h4", "h5", "h6"].map((tag) => {
        const heading = document.createElement(tag);
        heading.textContent = "Plain heading";
        main.append(heading);
        const probe = (property: string, value: string) => {
          const element = document.createElement("div");
          element.style.setProperty(property, value);
          heading.append(element);
          const result = getComputedStyle(element).getPropertyValue(property);
          element.remove();
          return result;
        };
        const style = getComputedStyle(heading);
        const result = {
          tag,
          fontSize: style.fontSize,
          margin: [style.marginTop, style.marginBottom],
          letterSpacing: style.letterSpacing,
          expected: {
            fontSize: probe("font-size", `var(--type-size-${tag})`),
            displayTracking: probe("letter-spacing", "var(--type-tracking-display)"),
            bodyTracking: probe("letter-spacing", "var(--type-tracking-body)"),
          },
        };
        heading.remove();
        return result;
      });
    });

    for (const heading of computed) {
      expect(heading.fontSize, heading.tag).toBe(heading.expected.fontSize);
      expect(heading.margin, heading.tag).toEqual(["0px", "0px"]);
      expect(heading.letterSpacing, heading.tag).toBe(
        heading.tag === "h2" ? heading.expected.displayTracking : heading.expected.bodyTracking,
      );
    }
    expect(computed[0]?.expected.displayTracking).not.toBe(computed[0]?.expected.bodyTracking);
  });

  test.describe("at 320px wide", () => {
    test.use({ viewport: { width: 320, height: 640 } });

    test("causes no horizontal scroll, and the display line breaks instead of overflowing (WCAG 1.4.10)", async ({
      page,
    }) => {
      const typography = main(page);
      await typography.scrollIntoViewIfNeeded();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
      const display = example(typography, "Type scale").getByText(scale.display, { exact: true });
      expect(await display.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
      expect(await lines(display)).toBeGreaterThan(1);
    });

    test("breaks a long unbroken word instead of overflowing (R12.4)", async ({ page }) => {
      const scale = example(main(page), "Type scale");
      await scale.scrollIntoViewIfNeeded();

      // A copy of the body item, so it has Typography's classes, holding one word wider than the panel.
      const overflow = await scale.getByText("Body, 16px", { exact: true }).evaluate((node) => {
        const copy = node.cloneNode() as HTMLElement;
        copy.textContent = "Pneumonoultramicroscopicsilicovolcanoconiosis".repeat(2);
        node.after(copy);
        const wrapped = copy.scrollWidth - copy.clientWidth;
        const page = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        copy.style.overflowWrap = "normal";
        const unwrapped = copy.scrollWidth - copy.clientWidth;
        copy.remove();
        return { wrapped, page, unwrapped };
      });
      expect(overflow.wrapped).toBe(0);
      expect(overflow.page).toBe(0);
      // Without overflow-wrap the word would overflow, so the check above exercises it.
      expect(overflow.unwrapped).toBeGreaterThan(0);
    });
  });
});
