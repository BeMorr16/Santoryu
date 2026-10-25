import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test } from "@playwright/test";
import { example, main, probe } from "./support.ts";

test.describe("Stack (refinement R6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("stack"));
  });

  test("wraps a horizontal Stack with no wrap prop, without overflowing (R6.1)", async ({
    page,
  }) => {
    const list = example(main(page), "Wrapping by default").getByRole("list");

    const tops = await list
      .getByRole("listitem")
      .evaluateAll((items) => items.map((item) => (item as HTMLElement).offsetTop));
    expect(tops).toHaveLength(6);
    expect(new Set(tops).size).toBeGreaterThan(1);
    const overflow = await list.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("takes rowGap from space.stack.* and the column gap from gap's space.inline.* (R6.2, R6.3)", async ({
    page,
  }) => {
    const list = example(main(page), "Row and column gaps").getByRole("list");

    await expect(list).toHaveCSS("row-gap", await probe(list, "row-gap", "var(--space-stack-xs)"));
    await expect(list).toHaveCSS(
      "column-gap",
      await probe(list, "column-gap", "var(--space-inline-md)"),
    );
  });

  test("gives a vertical Stack both gaps, so wrapped columns are spaced too (R6.3)", async ({
    page,
  }) => {
    const stretched = example(main(page), "Vertical alignment")
      .getByRole("button", { name: "Stretched (default)" })
      .locator("xpath=..");

    await expect(stretched).toHaveCSS("flex-direction", "column");
    await expect(stretched).toHaveCSS(
      "row-gap",
      await probe(stretched, "row-gap", "var(--space-stack-md)"),
    );
    await expect(stretched).toHaveCSS(
      "column-gap",
      await probe(stretched, "column-gap", "var(--space-inline-md)"),
    );
  });

  test("spaces a fieldset's legend from the first option by the row gap (R6.4)", async ({
    page,
  }) => {
    const group = example(main(page), "Semantics").getByRole("group", {
      name: "Contact preference",
    });
    const expected = Number.parseFloat(
      await probe(group, "padding-block-end", "var(--space-stack-sm)"),
    );

    const legend = group.locator("legend");
    await expect(legend).toHaveCSS("padding-inline-start", "0px");
    await expect(legend).toHaveCSS("padding-inline-end", "0px");
    const distance = await group.evaluate((element) => {
      const legend = element.querySelector("legend");
      const first = element.querySelector("label");
      if (legend === null || first === null) throw new Error("no legend or option");
      const style = getComputedStyle(legend);
      const contentBottom =
        legend.getBoundingClientRect().bottom -
        Number.parseFloat(style.paddingBlockEnd) -
        Number.parseFloat(style.borderBlockEndWidth);
      return first.getBoundingClientRect().top - contentBottom;
    });
    expect(expected).toBeGreaterThan(0);
    expect(Math.abs(distance - expected)).toBeLessThanOrEqual(1);
  });

  test("lets a class on the legend override its padding (R6.4)", async ({ page }) => {
    const legend = example(main(page), "Semantics").locator("legend");

    await legend.evaluate((element) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(".flush { padding: 0; }");
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      element.classList.add("flush");
    });

    await expect(legend).toHaveCSS("padding-block-end", "0px");
  });
});
