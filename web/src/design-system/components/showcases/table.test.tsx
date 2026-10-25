import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import hiddenStyles from "../../../components/VisuallyHidden/VisuallyHidden.module.css";
import showcaseStyles from "../Showcase.module.css";
import tableStyles from "../../../components/Table/Table.module.css";
import { buildSizes, customTableCss, keySupport, scrollers, tableKeyboard } from "./table.tsx";
import {
  describeComponentPage,
  exampleTitle,
  renderComponentPage,
  showcases,
} from "../component-page-test.tsx";
import * as route from "../../../routes/design-system/components/table.tsx";

const renderPage = () => renderComponentPage(route, "table");

describeComponentPage(route, "table");

describe("Table page examples", () => {
  it("shows the Table examples, its props, keyboard rows, notes and the customized CSS it applies (refinement R16.10)", async () => {
    await renderPage();
    const section = screen.getByRole("main");
    const example = (title: string) => within(section).getByRole("group", { name: title });
    const tableIn = (element: HTMLElement, name: string) =>
      within(element).getByRole("table", { name });
    const columnsOf = (table: HTMLElement) =>
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);
    const rowHeadersOf = (table: HTMLElement) =>
      within(table)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent);

    const labels = [...section.querySelectorAll(exampleTitle)].map((label) => label.textContent);
    expect(labels).toEqual([
      "Basic",
      "Wide",
      "Spanning cells and a footer",
      "Hidden caption",
      "Customized with component tokens",
    ]);

    const basic = tableIn(example("Basic"), scrollers.caption);
    expect(columnsOf(basic)).toEqual(scrollers.columns);
    expect(rowHeadersOf(basic)).toEqual(scrollers.rows.map(([engine]) => engine));
    expect(basic.querySelector("caption")).toBeVisible();

    const wideExample = example("Wide");
    const wide = tableIn(wideExample, keySupport.caption);
    expect(columnsOf(wide)).toEqual(["Component", ...keySupport.keys]);
    expect(
      within(wide)
        .getAllByRole("columnheader")
        .slice(1)
        .every((cell) => cell.firstElementChild?.tagName === "KBD"),
    ).toBe(true);
    expect(rowHeadersOf(wide)).toEqual(keySupport.rows.map(([component]) => component));
    for (const row of keySupport.rows) expect(row).toHaveLength(keySupport.keys.length + 1);
    expect(wide.parentElement).toHaveClass(showcaseStyles.wideTable ?? "");
    // Before it's measured, a table is a focusable group named by its caption (R16.6).
    expect(within(wideExample).getByRole("group", { name: keySupport.caption })).toBe(
      wide.parentElement,
    );
    expect(wideExample).toHaveTextContent(`Announced as: “${keySupport.caption}, group”`);

    const sizes = tableIn(example("Spanning cells and a footer"), buildSizes.caption);
    const [file, size, raw, gzip] = within(sizes).getAllByRole("columnheader");
    expect(file).toHaveAttribute("rowspan", "2");
    // Derived from TableHead (refinement R16.4).
    expect(file).toHaveAttribute("scope", "col");
    expect(size).toHaveTextContent("Size (kB)");
    expect(size).toHaveAttribute("colspan", "2");
    expect(size).toHaveAttribute("scope", "colgroup");
    // A colgroup header needs the column groups it heads: File, then Raw and Gzip.
    expect(
      [...sizes.querySelectorAll(":scope > colgroup")].map((group) => group.getAttribute("span")),
    ).toEqual([null, "2"]);
    expect(size).toHaveClass(tableStyles.alignCenter ?? "");
    for (const header of [raw, gzip]) expect(header).toHaveClass(tableStyles.alignEnd ?? "");
    expect(rowHeadersOf(sizes)).toEqual([...buildSizes.rows.map(([name]) => name), "Total"]);
    for (const cell of within(sizes).getAllByRole("cell")) {
      expect(cell).toHaveClass(tableStyles.alignEnd ?? "");
    }
    const footer = sizes.querySelector("tfoot");
    expect(footer).toHaveTextContent(`Total${buildSizes.total.join("")}`);
    const sum = (column: 1 | 2) =>
      buildSizes.rows.reduce((total, row) => total + Number(row[column]), 0).toFixed(1);
    expect([sum(1), sum(2)]).toEqual(buildSizes.total);

    const hiddenExample = example("Hidden caption");
    const heading = within(hiddenExample).getByRole("heading", { level: 4, name: "Theme keys" });
    const hidden = tableIn(hiddenExample, "Theme keys");
    expect(heading.nextElementSibling).toBe(hidden.parentElement);
    expect(hidden.querySelector("caption")).toHaveClass(hiddenStyles.root ?? "");
    expect(rowHeadersOf(hidden)).toEqual(["light", "dark"]);
    expect(hiddenExample).toHaveTextContent("Announced as: “Theme keys, table”");

    const custom = example("Customized with component tokens");
    expect(tableIn(custom, scrollers.caption).parentElement).toHaveClass(
      showcaseStyles.customTable ?? "",
    );
    expect(custom.querySelector("pre code")?.textContent).toBe(customTableCss);
    expect(readFileSync(join(import.meta.dirname, "..", "Showcase.module.css"), "utf8")).toContain(
      customTableCss,
    );

    const table = showcases.find((s) => s.id === "table");
    expect(table?.props.map(({ part, docs }) => [part, Object.keys(docs)])).toEqual([
      ["Table", ["caption", "hideCaption", "children"]],
      ["TableHeaderCell", ["scope", "align", "children"]],
      ["TableCell", ["align", "children"]],
    ]);
    expect(table?.propsNote).toMatch(
      /TableHead, TableBody, TableFoot and TableRow take only children and their element's native props.+className and native props reach each part's element, and Table's reach the root div.+caption holds no links or buttons.+Native thead, tr, th and td inside a Table get the look, but not the automatic scope/,
    );
    expect(table?.keyboard).toEqual(tableKeyboard);
    expect(tableKeyboard.map((row) => row.keys)).toEqual(["Tab / Shift+Tab", "← / →"]);
    for (const note of [
      /The caption names the table.+hideCaption hides it visually but keeps it for assistive technology/,
      /scope comes from where it sits.+An explicit scope always wins/,
      /focusable group named by its caption.+Safari doesn't make scrolling boxes focusable.+no longer a Tab stop.+every table is one/,
      /a group, not a region, so a page of tables doesn't fill the landmarks list/,
      /stripes, border and lines are decorative.+In forced colors the stripes go, and each body row gets a line instead/,
      /Use a table for tabular data, never for layout/,
    ]) {
      expect(within(section).getByText(note)).toBeInTheDocument();
    }
  });
});
