import { componentPath } from "../../web/src/design-system/components/pages.ts";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  animationsSettled,
  example,
  main,
  probe,
  storeTheme,
  tabKey,
  themes,
  tokenColor,
} from "./support.ts";

const tables = (page: Page) => main(page);

/** The Table root (the scroll box) of an example in the Table section, by the example's title. */
const rootIn = (page: Page, title: string) =>
  example(tables(page), title).locator("table").first().locator("xpath=..");

/** Whether the element's content is wider than its box. */
const overflows = (element: Locator) =>
  element.evaluate((node) => node.scrollWidth > node.clientWidth);

/** The computed `property` of every cell in a row, as one value when they all agree. */
const rowStyle = (row: Locator, property: string) =>
  row.evaluate(
    (node, name) => [
      ...new Set([...node.children].map((cell) => getComputedStyle(cell).getPropertyValue(name))),
    ],
    property,
  );

test.describe("Table (refinement R16)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(componentPath("table"));
  });

  test("a wide table scrolls inside its box, never the page, at 320px (R16.6)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await animationsSettled(page);
    const wide = rootIn(page, "Wide");

    expect(await overflows(wide)).toBe(true);
    expect(await wide.evaluate((node) => node.getBoundingClientRect().right)).toBeLessThanOrEqual(
      320,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("an overflowing table is a focusable group named by its caption, and one that fits isn't (R16.6)", async ({
    page,
    browserName,
  }) => {
    // First the table that fits: once it has lost its prerendered Tab stop, tables are measured.
    const basic = rootIn(page, "Basic");
    await expect(basic).not.toHaveAttribute("tabindex");
    await expect(basic).not.toHaveAttribute("role");
    expect(await overflows(basic)).toBe(false);

    const group = example(tables(page), "Wide").getByRole("group", {
      name: "Library keyboard support",
      exact: true,
    });
    await expect(group).toHaveAttribute("tabindex", "0");
    expect(await overflows(group)).toBe(true);
    expect(await group.evaluate((node) => node.firstElementChild?.tagName)).toBe("TABLE");

    // From the panel's theme menu, Tab skips the Basic table (it fits) and reaches this one.
    const trigger = page.getByRole("button", { name: /\(Table examples preview\)$/ });
    await trigger.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(group).toBeFocused();
    await page.keyboard.press(tabKey(browserName, true));
    await expect(trigger).toBeFocused();
  });

  test("a table gains its Tab stop when the window narrows and drops it when it widens (R16.6)", async ({
    page,
  }) => {
    // The page's own props table: it fits a wide window and overflows at 320px.
    const props = tables(page).getByRole("table", { name: "Table props", exact: true });
    await expect(props).toBeVisible();
    const root = props.locator("xpath=..");
    await expect(root).not.toHaveAttribute("tabindex");
    await expect(root).not.toHaveAttribute("role");

    await page.setViewportSize({ width: 320, height: 640 });
    await expect(root).toHaveAttribute("tabindex", "0");
    await expect(root).toHaveAttribute("role", "group");
    expect(await overflows(root)).toBe(true);

    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(root).not.toHaveAttribute("tabindex");
    await expect(root).not.toHaveAttribute("role");
  });

  test("arrow keys scroll the focused table (R16.6)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Playwright's WebKit drops keyboard scrolls.");
    const wide = rootIn(page, "Wide");
    await wide.focus();

    await page.keyboard.press("ArrowRight");

    await expect.poll(() => wide.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  });

  for (const theme of themes) {
    test(`draws a bordered panel with stripes, head and foot fills and lines in ${theme} (R16.7)`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      // Already on this URL, so only a reload runs the stored theme's init script.
      await page.reload();
      const root = rootIn(page, "Spanning cells and a footer");
      const table = root.locator("> table");
      const rows = table.locator("> tbody > tr");
      const raised = tokenColor("color.surface.raised", theme);
      const base = tokenColor("color.surface.base", theme);
      const sunken = tokenColor("color.surface.sunken", theme);
      const border = tokenColor("color.border.subtle", theme);

      await expect(table).toHaveCSS("background-color", raised);
      await expect(table).toHaveCSS("color", tokenColor("color.text.default", theme));
      await expect(table).toHaveCSS("border-top-color", border);
      await expect(table).toHaveCSS("border-top-style", "solid");
      await expect(table).toHaveCSS("border-collapse", "separate");
      // A probe without a border style computes its border width as 0, so read the length as padding.
      const borderWidth = await probe(root, "padding-top", "var(--effect-border-width)");
      await expect(table).toHaveCSS("border-top-width", borderWidth);
      await expect(table).toHaveCSS(
        "border-top-left-radius",
        await probe(root, "border-top-left-radius", "var(--radius-surface)"),
      );

      // Stripes: the first body row and every other one after it show the panel fill.
      const clear = "rgba(0, 0, 0, 0)";
      expect(await rowStyle(rows.nth(0), "background-color")).toEqual([clear]);
      expect(await rowStyle(rows.nth(1), "background-color")).toEqual([base]);
      expect(await rowStyle(rows.nth(2), "background-color")).toEqual([clear]);
      // No lines between body rows.
      expect(await rowStyle(rows.nth(1), "border-top-style")).toEqual(["none"]);
      expect(await rowStyle(rows.nth(0), "border-bottom-style")).toEqual(["none"]);

      // Head: sunken, strong; a line under it, on the body's first row.
      for (const row of await table.locator("> thead > tr").all()) {
        expect(await rowStyle(row, "background-color")).toEqual([sunken]);
        expect(await rowStyle(row, "font-weight")).toEqual(["600"]);
      }
      expect(await rowStyle(rows.nth(0), "border-top-color")).toEqual([border]);
      expect(await rowStyle(rows.nth(0), "border-top-style")).toEqual(["solid"]);
      // Row headers in the body at body weight.
      await expect(rows.nth(0).locator("> th")).toHaveCSS("font-weight", "400");

      // Foot: sunken, with a line above it.
      const foot = table.locator("> tfoot > tr").first();
      expect(await rowStyle(foot, "background-color")).toEqual([sunken]);
      expect(await rowStyle(foot, "border-top-color")).toEqual([border]);

      // Cells: padding from the tokens, top-aligned, numbers at the end.
      const cell = rows.nth(0).locator("> td").first();
      for (const property of ["padding-top", "padding-left"]) {
        await expect(cell).toHaveCSS(
          property,
          await probe(root, property, "var(--space-inset-sm)"),
        );
      }
      await expect(cell).toHaveCSS("vertical-align", "top");
      await expect(cell).toHaveCSS("text-align", "end");
      await expect(rows.nth(0).locator("> th")).toHaveCSS("text-align", "start");
      await expect(table.locator("> thead > tr").first().locator("> th").nth(1)).toHaveCSS(
        "text-align",
        "center",
      );

      // The caption: above the panel's border, at the start, muted, a gap before the panel.
      const caption = table.locator("> caption");
      await expect(caption).toHaveCSS("color", tokenColor("color.text.muted", theme));
      await expect(caption).toHaveCSS("text-align", "start");
      const gap = Number.parseFloat(await probe(root, "padding-top", "var(--space-stack-sm)"));
      const [captionBottom, headTop] = await table.evaluate((node) => [
        node.querySelector("caption")?.getBoundingClientRect().bottom ?? 0,
        node.querySelector("thead > tr > *")?.getBoundingClientRect().top ?? 0,
      ]);
      expect(headTop - captionBottom).toBeCloseTo(gap + Number.parseFloat(borderWidth), 0);
    });
  }

  test("rounds the corner cells inside the panel's border, so no fill passes it (R16.7)", async ({
    page,
  }) => {
    const root = rootIn(page, "Spanning cells and a footer");
    const inner = await probe(
      root,
      "border-top-left-radius",
      "calc(var(--radius-surface) - var(--effect-border-width))",
    );
    const corners = await root.evaluate((node) => {
      const table = node.querySelector("table");
      const first = table?.querySelector(":scope > thead > tr:first-child");
      const last = table?.querySelector(":scope > tfoot > tr:last-child");
      const radius = (cell: Element | null | undefined, corner: string) =>
        cell ? getComputedStyle(cell).getPropertyValue(`border-${corner}-radius`) : "";
      return {
        topLeft: radius(first?.firstElementChild, "top-left"),
        topRight: radius(first?.lastElementChild, "top-right"),
        bottomLeft: radius(last?.firstElementChild, "bottom-left"),
        bottomRight: radius(last?.lastElementChild, "bottom-right"),
        // A cell away from the corners keeps square corners.
        body: radius(table?.querySelector(":scope > tbody > tr > td"), "top-left"),
      };
    });

    expect(corners).toEqual({
      topLeft: inner,
      topRight: inner,
      bottomLeft: inner,
      bottomRight: inner,
      body: "0px",
    });
  });

  test("counts the stripes again in each body (R16.7)", async ({ page }) => {
    const root = rootIn(page, "Basic");
    // Measured, so hydrated: React won't replace the markup copied in below.
    await expect(root).not.toHaveAttribute("tabindex");
    // A second body, as native markup gets the look too: copied from the first.
    await root.evaluate((node) => {
      const body = node.querySelector("table > tbody");
      if (body) body.after(body.cloneNode(true));
    });
    const fills = await root.evaluate((node) =>
      [...node.querySelectorAll("table > tbody")].map((body) =>
        [...body.querySelectorAll(":scope > tr")].map(
          (row) => getComputedStyle(row.firstElementChild ?? row).backgroundColor,
        ),
      ),
    );
    // Odd rows' cells are clear, over the panel fill.
    const clear = "rgba(0, 0, 0, 0)";
    const base = tokenColor("color.surface.base", "light");

    expect(fills).toEqual([
      [clear, base, clear],
      [clear, base, clear],
    ]);
  });

  test("draws the focus ring around the focused table (R16.7)", async ({ page, browserName }) => {
    const wide = rootIn(page, "Wide");
    // Once the Basic table has lost its prerendered Tab stop, Tab skips it.
    await expect(rootIn(page, "Basic")).not.toHaveAttribute("tabindex");
    await page.getByRole("button", { name: /\(Table examples preview\)$/ }).focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(wide).toBeFocused();

    await expect(wide).toHaveCSS("outline-style", "solid");
    await expect(wide).toHaveCSS(
      "outline-color",
      await probe(wide, "color", "var(--component-table-focus-ring-color)"),
    );
  });

  test("keeps the border, head and foot lines, row lines and focus ring under forced colors (R16.9)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "WebKit doesn't emulate forced colors.");
    await page.emulateMedia({ forcedColors: "active" });
    const root = rootIn(page, "Spanning cells and a footer");
    const table = root.locator("> table");
    const fill = await table.evaluate((node) => getComputedStyle(node).backgroundColor);
    const visible = (color: string) => color !== fill && color !== "rgba(0, 0, 0, 0)";

    const lines = await table.evaluate((node) => {
      const style = (selector: string, edge: string) => {
        const cell = node.querySelector(selector);
        if (!cell) return { color: "", style: "none" };
        const computed = getComputedStyle(cell);
        return {
          color: computed.getPropertyValue(`border-${edge}-color`),
          style: computed.getPropertyValue(`border-${edge}-style`),
        };
      };
      return {
        panel: {
          color: getComputedStyle(node).borderTopColor,
          style: getComputedStyle(node).borderTopStyle,
        },
        head: style(":scope > tbody > tr:first-child > *", "top"),
        rows: [...node.querySelectorAll(":scope > tbody > tr:not(:last-child) > *")].map(
          (cell) => ({
            color: getComputedStyle(cell).borderBottomColor,
            style: getComputedStyle(cell).borderBottomStyle,
          }),
        ),
        foot: style(":scope > tfoot > tr:first-child > *", "top"),
      };
    });
    for (const line of [lines.panel, lines.head, lines.foot, ...lines.rows]) {
      expect(line.style).toBe("solid");
      expect(visible(line.color)).toBe(true);
    }
    expect(lines.rows.length).toBeGreaterThan(0);

    // Between two bodies too: a second body, copied from the first once hydrated (measured).
    await expect(rootIn(page, "Basic")).not.toHaveAttribute("tabindex");
    const basic = rootIn(page, "Basic").locator("> table");
    await basic.evaluate((node) => {
      const body = node.querySelector(":scope > tbody");
      if (body) body.after(body.cloneNode(true));
    });
    const between = await basic.evaluate((node) => {
      const cell = node.querySelector(":scope > tbody + tbody > tr:first-child > *");
      const style = cell ? getComputedStyle(cell) : null;
      return { color: style?.borderTopColor ?? "", style: style?.borderTopStyle ?? "none" };
    });
    expect(between.style).toBe("solid");
    expect(visible(between.color)).toBe(true);

    const wide = rootIn(page, "Wide");
    await wide.focus();
    await expect(wide).toHaveCSS("outline-style", "solid");
    expect(visible(await wide.evaluate((node) => getComputedStyle(node).outlineColor))).toBe(true);
  });

  test("a hidden caption still names the table and takes no visible space (R16.3)", async ({
    page,
  }) => {
    const hidden = example(tables(page), "Hidden caption");
    const table = hidden.getByRole("table", { name: "Theme keys", exact: true });
    await expect(table).toBeVisible();

    const geometry = await table.evaluate((node) => {
      const caption = node.querySelector("caption")?.getBoundingClientRect();
      const firstCell = node.querySelector("thead > tr > *")?.getBoundingClientRect();
      const tableTop = node.getBoundingClientRect().top;
      const border = Number.parseFloat(getComputedStyle(node).borderTopWidth);
      return {
        captionArea: (caption?.width ?? 0) * (caption?.height ?? 0),
        offset: (firstCell?.top ?? 0) - tableTop - border,
      };
    });
    expect(geometry.captionArea).toBeLessThanOrEqual(1);
    expect(geometry.offset).toBeCloseTo(0, 0);
  });
});
