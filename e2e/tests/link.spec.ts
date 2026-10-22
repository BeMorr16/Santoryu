import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator } from "@playwright/test";
import { example, main, tabKey } from "./support.ts";

/** What `color: value` computes to inside `scope`, read from a probe set through CSSOM. */
async function probeColor(scope: Locator, value: string) {
  return scope.evaluate((element, value) => {
    const probe = document.createElement("span");
    probe.style.setProperty("color", value);
    element.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, value);
}

/**
 * For each width, whether the new-tab icon shares a line with the last character of the link's
 * text (their boxes overlap vertically). Widths are set on the paragraph through CSSOM.
 */
async function iconOnLastWordLine(paragraph: Locator, widths: number[]) {
  return paragraph.evaluate((element, widths) => {
    const link = element.querySelector("a");
    const icon = link?.querySelector("svg");
    const text = link?.firstChild;
    if (!(element instanceof HTMLElement) || !icon || text?.nodeType !== Node.TEXT_NODE) {
      throw new Error("no new-tab link");
    }
    const range = document.createRange();
    const length = text.textContent?.length ?? 0;
    range.setStart(text, length - 1);
    range.setEnd(text, length);
    element.style.maxInlineSize = "none";
    return widths.map((width) => {
      element.style.inlineSize = `${String(width)}px`;
      const last = range.getBoundingClientRect();
      const box = icon.getBoundingClientRect();
      return box.top < last.bottom && box.bottom > last.top;
    });
  }, widths);
}

/**
 * A new-tab link's name. The hidden text is block-level (absolutely positioned), so name
 * computations that follow the spec, Chromium's included, add a space before its comma.
 */
const newTabName = (text: string) => new RegExp(`^${text} ?, opens in new tab$`);

const widths = Array.from({ length: 51 }, (_, index) => 120 + index * 4);

test.describe("Link (refinement R4)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("link"));
  });

  test("keeps the new-tab icon on the last word's line at every width (R4.2)", async ({ page }) => {
    const paragraph = example(main(page), "New tab").getByText(/The code for this site is on/);

    expect(await iconOnLastWordLine(paragraph, widths)).toEqual(widths.map(() => true));

    // Control: with the icon unwrapped (no joiner, no nowrap), some width puts it on a line of
    // its own, so the widths above do reach the break.
    await paragraph.evaluate((element) => {
      const wrapper = element.querySelector("a svg")?.parentElement;
      const icon = wrapper?.querySelector("svg");
      if (wrapper && icon) wrapper.replaceWith(icon);
    });
    expect(await iconOnLastWordLine(paragraph, widths)).toContain(false);
  });

  test("renders nothing after the new-tab icon (R4.2)", async ({ page }) => {
    // The link inside the sentence: the standalone one is blockified by the column layout.
    const link = example(main(page), "New tab")
      .getByText(/The code for this site is on/)
      .getByRole("link", { name: newTabName("GitHub") });

    const [linkEnd, iconEnd] = await link.evaluate((element) => {
      const rects = element.getClientRects();
      const last = rects[rects.length - 1];
      const icon = element.querySelector("svg")?.getBoundingClientRect();
      if (last === undefined || icon === undefined) throw new Error("no boxes");
      return [last.right, icon.right];
    });
    expect(Math.abs(linkEnd - iconEnd)).toBeLessThanOrEqual(0.5);
  });

  test("spaces a button-styled new-tab icon with Button's gap alone (R4.3)", async ({ page }) => {
    const link = example(main(page), "As a button").getByRole("link", {
      name: newTabName("LinkedIn"),
    });

    const { distance, gap } = await link.evaluate((element) => {
      const text = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      const icons = element.querySelectorAll("svg");
      const icon = icons[icons.length - 1];
      if (text === undefined || icon === undefined) throw new Error("no label or icon");
      const range = document.createRange();
      range.selectNodeContents(text);
      return {
        distance: icon.getBoundingClientRect().left - range.getBoundingClientRect().right,
        gap: Number.parseFloat(getComputedStyle(element).columnGap),
      };
    });
    expect(gap).toBeGreaterThan(0);
    expect(Math.abs(distance - gap)).toBeLessThanOrEqual(0.5);
  });

  test("thickens the underline and changes color on hover (R4.4)", async ({ page }) => {
    const inline = example(main(page), "Inline, in running text");
    const link = inline.getByRole("link", { name: "design tokens" });

    await expect(link).toHaveCSS("text-decoration-thickness", "1px");
    await link.hover();

    await expect(link).toHaveCSS("text-decoration-thickness", "2px");
    await expect(link).toHaveCSS(
      "color",
      await probeColor(inline, "var(--component-link-color-hover)"),
    );
  });

  test("transitions only its color, with its own duration and easing (R4.4)", async ({ page }) => {
    const inline = example(main(page), "Inline, in running text");
    const link = inline.getByRole("link", { name: "design tokens" });
    const expected = await inline.evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.setProperty("transition-duration", "var(--component-link-transition-duration)");
      probe.style.setProperty(
        "transition-timing-function",
        "var(--component-link-transition-easing)",
      );
      element.append(probe);
      const { transitionDuration, transitionTimingFunction } = getComputedStyle(probe);
      probe.remove();
      return { transitionDuration, transitionTimingFunction };
    });

    await expect(link).toHaveCSS("transition-property", "color");
    await expect(link).toHaveCSS("transition-duration", expected.transitionDuration);
    await expect(link).toHaveCSS("transition-timing-function", expected.transitionTimingFunction);
  });

  test("draws its focus ring in component.link.focus-ring-color (R4.5)", async ({
    page,
    browserName,
  }) => {
    const inline = example(main(page), "Inline, in running text");
    const link = inline.getByRole("link", { name: "design tokens" });
    // Back and forward by keyboard, so the link has focus from the keyboard and :focus-visible matches.
    await link.focus();
    await page.keyboard.press(tabKey(browserName, true));
    await page.keyboard.press(tabKey(browserName));

    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS(
      "outline-color",
      await probeColor(inline, "var(--component-link-focus-ring-color)"),
    );
  });

  test("marks the current page after client-side navigation (R4.8)", async ({ page }) => {
    await page.goto(componentPath("button"));
    await page
      .getByRole("navigation", { name: "Components" })
      .getByRole("link", { name: "Link", exact: true })
      .click();
    await expect(page).toHaveURL(/\/design-system\/components\/link$/);

    const current = example(main(page), "Current page");
    await expect(current.getByRole("link", { name: "This page", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(current.getByRole("link", { name: "This page, unmarked" })).toHaveAttribute(
      "aria-current",
      "false",
    );
  });
});

test.describe("Link in Chromium's accessibility tree (refinement R4.2)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Reads the tree through CDP.");

  test("names a new-tab link with its text and “, opens in new tab”", async ({ page }) => {
    await page.goto(componentPath("link"));
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as {
      nodes: { role?: { value: string }; name?: { value: string } }[];
    };

    const names = nodes
      .filter((node) => node.role?.value === "link")
      .map((node) => node.name?.value)
      .filter((name) => name?.includes("opens in new tab"));
    expect(names).toContain("GitHub , opens in new tab");
    expect(names).toContain("LinkedIn , opens in new tab");
  });
});

test.describe("Link before hydration (refinement R4.8)", () => {
  test.use({ javaScriptEnabled: false });

  test("prerenders aria-current on the current page", async ({ page }) => {
    await page.goto(componentPath("link"));

    const current = example(main(page), "Current page");
    await expect(current.getByRole("link", { name: "This page", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(current.getByRole("link", { name: "This page, unmarked" })).toHaveAttribute(
      "aria-current",
      "false",
    );
  });
});

test.describe("Link on a touch screen (refinement R4.4)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Touch emulation is Chromium-only.");
  test.use({ hasTouch: true, isMobile: true });

  test("leaves no hover look behind after a tap", async ({ page }) => {
    await page.goto(componentPath("link"));
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
    const inline = example(main(page), "Inline, in running text");
    const link = inline.getByRole("link", { name: "design tokens" });
    // Stays on the page, so the tapped link can be inspected.
    await link.evaluate((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
      });
    });

    await link.tap();

    await expect(link).toHaveCSS("text-decoration-thickness", "1px");
    await expect(link).toHaveCSS("color", await probeColor(inline, "var(--component-link-color)"));
  });
});
