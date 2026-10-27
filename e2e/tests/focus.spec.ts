import { expect, test } from "@playwright/test";
import {
  componentPages,
  componentPath,
  componentsPath,
} from "../../web/src/design-system/components/pages.ts";
import { openAllAccordions, walk, weakRings, type Ring } from "./support.ts";

test("every control on the docs pages shows a 2px, 3:1 focus ring from the keyboard (R3.8, R16.5)", async ({
  page,
  browserName,
}) => {
  // Every docs page in turn (ds-components R7.3), so the counts below cover the whole library.
  test.setTimeout(300_000);
  const rings: Ring[] = [];
  const open: Ring[] = [];
  let overflowing = 0;
  for (const path of [componentsPath, ...componentPages.map(({ id }) => componentPath(id))]) {
    await page.goto(path);
    rings.push(...(await walk(page, browserName)));

    // Folded content too (refinement R13.14). A table's root is a Tab stop exactly while it
    // overflows (refinement R16.6).
    await openAllAccordions(page);
    const scrollers = await page.evaluate(() =>
      [...document.querySelectorAll("table")].map((table) => {
        const root = table.parentElement;
        return {
          name: table.querySelector("caption")?.textContent ?? "",
          overflows: root !== null && root.scrollWidth > root.clientWidth,
          tabStop: root?.getAttribute("tabindex") === "0",
        };
      }),
    );
    expect(
      scrollers.filter((scroller) => scroller.overflows !== scroller.tabStop),
      path,
    ).toEqual([]);
    overflowing += scrollers.filter((scroller) => scroller.overflows).length;
    await page.getByRole("main").focus();
    open.push(...(await walk(page, browserName)));
  }

  expect(rings.length).toBeGreaterThan(40);
  expect(weakRings(rings)).toEqual([]);
  expect(overflowing).toBeGreaterThan(0);
  expect(open.filter((ring) => ring.label.startsWith("div")).length).toBeGreaterThanOrEqual(
    overflowing,
  );
  expect(weakRings(open)).toEqual([]);
});
