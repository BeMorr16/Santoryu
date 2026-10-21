import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator } from "@playwright/test";
import { example, main, probe } from "./support.ts";

/** The widths of a Grid's tracks that hold space; auto-fit's collapsed tracks compute to 0px. */
const tracks = (grid: Locator) =>
  grid.evaluate((element) =>
    getComputedStyle(element)
      .gridTemplateColumns.split(" ")
      .map((track) => Number.parseFloat(track))
      .filter((width) => width > 0),
  );

test.describe("Grid (refinement R7)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("grid"));
  });

  test("takes rowGap from space.stack.* and columnGap from space.inline.* (R7.1)", async ({
    page,
  }) => {
    const list = example(main(page), "Row and column gaps").getByRole("list");

    await expect(list).toHaveCSS("row-gap", await probe(list, "row-gap", "var(--space-stack-xs)"));
    await expect(list).toHaveCSS(
      "column-gap",
      await probe(list, "column-gap", "var(--space-inline-xl)"),
    );
  });

  test("stretches a short row's items to fill it by default (R7.2)", async ({ page }) => {
    const list = example(main(page), "Few items, stretched (default)").getByRole("list");

    const { filled, width } = await list.evaluate((element) => {
      const items = [...element.children].map((item) => item.getBoundingClientRect().width);
      const gap = Number.parseFloat(getComputedStyle(element).columnGap);
      return {
        filled: items.reduce((sum, item) => sum + item, 0) + gap * (items.length - 1),
        width: element.clientWidth,
      };
    });
    expect(Math.abs(filled - width)).toBeLessThanOrEqual(1);
  });

  test("keeps a short row's empty columns with stretch={false} (R7.2)", async ({ page }) => {
    // Wide enough that the content column, between the side menu and the On this page rail, holds
    // more than two md columns.
    await page.setViewportSize({ width: 1600, height: 900 });
    const list = example(main(page), "Few items, stretch={false}").getByRole("list");

    await expect(list.getByRole("listitem")).toHaveCount(2);
    expect((await tracks(list)).length).toBeGreaterThan(2);
  });

  test("shows at most two columns, none narrower than min (R7.3)", async ({ page }) => {
    const list = example(main(page), "At most two columns").getByRole("list");
    const min = Number.parseFloat(await probe(list, "inline-size", "var(--size-column-sm)"));
    const gap = Number.parseFloat(await list.evaluate((e) => getComputedStyle(e).columnGap));

    // Room for at least three min-wide columns, so the cap is what limits them to two.
    const width = await list.evaluate((element) => element.clientWidth);
    expect(width).toBeGreaterThanOrEqual(3 * min + 2 * gap);
    const widths = await tracks(list);
    expect(widths).toHaveLength(2);
    for (const track of widths) expect(track).toBeGreaterThanOrEqual(min);
  });

  test("shows one column with no overflow in a container narrower than min (R9.2)", async ({
    page,
  }) => {
    const list = example(main(page), "Narrow container").getByRole("list");

    expect(await tracks(list)).toHaveLength(1);
    const overflow = await list.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("spaces a fieldset's legend from the first option by the row gap (refinement R6.4)", async ({
    page,
  }) => {
    const group = example(main(page), "Semantics").getByRole("group", {
      name: "Projects to show",
    });
    const expected = Number.parseFloat(
      await probe(group, "padding-block-end", "var(--space-stack-sm)"),
    );

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
});
