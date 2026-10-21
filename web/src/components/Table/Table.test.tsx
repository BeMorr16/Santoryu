import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { resize } from "../../../test/resize-observer.ts";
import hiddenStyles from "../VisuallyHidden/VisuallyHidden.module.css";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  type TableProps,
} from "./Table.tsx";
import styles from "./Table.module.css";

function Sizes(props: Partial<TableProps> & { children?: ReactNode }) {
  return (
    <Table caption="Build sizes" {...props}>
      {props.children ?? (
        <>
          <TableHead>
            <TableRow>
              <TableHeaderCell>File</TableHeaderCell>
              <TableHeaderCell align="end">Size</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell>index.html</TableHeaderCell>
              <TableCell align="end">12</TableCell>
            </TableRow>
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableCell align="end">12</TableCell>
            </TableRow>
          </TableFoot>
        </>
      )}
    </Table>
  );
}

function rootOf(container: HTMLElement) {
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error("No root");
  return root;
}

/** Gives the root a layout (jsdom has none) and reports a resize to its observer. */
function setOverflow(root: HTMLElement, overflowing: boolean) {
  Object.defineProperty(root, "clientWidth", { configurable: true, value: 300 });
  Object.defineProperty(root, "scrollWidth", {
    configurable: true,
    value: overflowing ? 600 : 300,
  });
  act(() => {
    resize(root, 100);
  });
}

describe("Table", () => {
  it("renders a root div holding a table, its caption first, then the sections (refinement R16.1, R16.2)", () => {
    const { container } = render(<Sizes />);

    const root = rootOf(container);
    expect(root.tagName).toBe("DIV");
    expect(root).toHaveClass(styles.root ?? "");
    const table = root.firstElementChild;
    expect(table?.tagName).toBe("TABLE");
    expect(table).toHaveClass(styles.table ?? "");
    expect([...(table?.children ?? [])].map((child) => child.tagName)).toEqual([
      "CAPTION",
      "THEAD",
      "TBODY",
      "TFOOT",
    ]);
    expect(table?.querySelector("caption")).toHaveClass(styles.caption ?? "");
  });

  it("passes className and native props to each part's element, and the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Table caption="x" ref={ref} className="root-extra" id="sizes" data-x="1">
        <TableHead className="head" data-part="head">
          <TableRow className="row">
            <TableHeaderCell className="th" id="file">
              File
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody className="body" data-part="body">
          <TableRow>
            <TableCell className="td" headers="file" colSpan={2}>
              a
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFoot className="foot" data-part="foot">
          <TableRow>
            <TableCell>b</TableCell>
          </TableRow>
        </TableFoot>
      </Table>,
    );

    const root = rootOf(container);
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(styles.root ?? "", "root-extra");
    expect(root).toHaveAttribute("id", "sizes");
    expect(root).toHaveAttribute("data-x", "1");
    expect(container.querySelector("thead")).toHaveClass("head");
    expect(container.querySelector("thead")).toHaveAttribute("data-part", "head");
    expect(container.querySelector("tbody")).toHaveClass("body");
    expect(container.querySelector("tfoot")).toHaveClass("foot");
    expect(container.querySelector("tr")).toHaveClass("row");
    expect(container.querySelector("th")).toHaveClass("th");
    expect(container.querySelector("th")).toHaveAttribute("id", "file");
    const td = container.querySelector("td");
    expect(td).toHaveClass("td");
    expect(td).toHaveAttribute("headers", "file");
    expect(td).toHaveAttribute("colspan", "2");
  });

  it("is named by its visible caption (refinement R16.2)", () => {
    render(<Sizes />);

    const table = screen.getByRole("table", { name: "Build sizes" });
    expect(screen.getByText("Build sizes")).not.toHaveClass(hiddenStyles.root ?? "");
    expect(table.querySelector("caption")).toBeVisible();
  });

  it("keeps a hidden caption as the table's name, visually hidden (refinement R16.3)", () => {
    const { container } = render(<Sizes hideCaption />);

    expect(screen.getByRole("table", { name: "Build sizes" })).toBeInTheDocument();
    const caption = container.querySelector("table > caption");
    expect(caption).toHaveTextContent("Build sizes");
    expect(caption).toHaveClass(hiddenStyles.root ?? "");
    expect(caption).not.toHaveClass(styles.caption ?? "");
  });

  describe("scope (refinement R16.4)", () => {
    it("makes head cells column headers, and body and foot header cells row headers", () => {
      render(<Sizes />);

      const table = screen.getByRole("table");
      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((cell) => [cell.textContent, cell.getAttribute("scope")]),
      ).toEqual([
        ["File", "col"],
        ["Size", "col"],
      ]);
      expect(
        within(table)
          .getAllByRole("rowheader")
          .map((cell) => [cell.textContent, cell.getAttribute("scope")]),
      ).toEqual([
        ["index.html", "row"],
        ["Total", "row"],
      ]);
    });

    it("sets none outside a section part, such as in a native thead", () => {
      const { container } = render(
        <Table caption="x">
          <thead>
            <tr>
              <TableHeaderCell>File</TableHeaderCell>
            </tr>
          </thead>
        </Table>,
      );

      expect(container.querySelector("th")).not.toHaveAttribute("scope");
    });

    it("lets an explicit scope win in every section", () => {
      const { container } = render(
        <Table caption="x">
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="colgroup" colSpan={2}>
                Size
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell scope="col">Name</TableHeaderCell>
              <TableHeaderCell scope="rowgroup">Group</TableHeaderCell>
            </TableRow>
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableHeaderCell scope="col">Total</TableHeaderCell>
            </TableRow>
          </TableFoot>
        </Table>,
      );

      expect([...container.querySelectorAll("th")].map((th) => th.getAttribute("scope"))).toEqual([
        "colgroup",
        "col",
        "rowgroup",
        "col",
      ]);
    });

    it("gives a nested Table's header cells their own section's scope", () => {
      render(
        <Table caption="Outer">
          <TableBody>
            <TableRow>
              <TableCell>
                <Table caption="Inner">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Inner column</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                </Table>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      expect(
        within(screen.getByRole("table", { name: "Inner" })).getByRole("columnheader"),
      ).toHaveAttribute("scope", "col");
    });
  });

  it("aligns cells through align, with no class for start (refinement R16.5)", () => {
    const { container } = render(
      <Table caption="x">
        <TableBody>
          <TableRow>
            <TableHeaderCell>a</TableHeaderCell>
            <TableHeaderCell align="center">b</TableHeaderCell>
            <TableHeaderCell align="end">c</TableHeaderCell>
            <TableCell>d</TableCell>
            <TableCell align="start">e</TableCell>
            <TableCell align="center">f</TableCell>
            <TableCell align="end">g</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const cells = [...container.querySelectorAll("th, td")];
    expect(cells.map((cell) => cell.getAttribute("class"))).toEqual([
      null,
      styles.alignCenter,
      styles.alignEnd,
      null,
      null,
      styles.alignCenter,
      styles.alignEnd,
    ]);
  });

  describe("overflow (refinement R16.6)", () => {
    it("is a focusable group named by the caption only while it overflows", () => {
      const { container } = render(<Sizes />);
      const root = rootOf(container);

      setOverflow(root, true);
      expect(root).toHaveAttribute("tabindex", "0");
      expect(screen.getByRole("group", { name: "Build sizes" })).toBe(root);

      setOverflow(root, false);
      expect(root).not.toHaveAttribute("tabindex");
      expect(root).not.toHaveAttribute("role");
      expect(root).not.toHaveAttribute("aria-labelledby");
    });

    it("is named by a hidden caption too", () => {
      const { container } = render(<Sizes hideCaption />);

      setOverflow(rootOf(container), true);

      expect(screen.getByRole("group", { name: "Build sizes" })).toBe(rootOf(container));
    });

    it("keeps a focused table's Tab stop until it blurs, so focus never drops to the body", () => {
      const { container } = render(<Sizes />);
      const root = rootOf(container);
      setOverflow(root, true);
      act(() => {
        root.focus();
      });

      setOverflow(root, false);
      expect(root).toHaveFocus();
      expect(root).toHaveAttribute("tabindex", "0");

      act(() => {
        root.blur();
      });
      expect(root).not.toHaveAttribute("tabindex");
    });

    it("is prerendered as a focusable group named by the caption", () => {
      const holder = document.createElement("div");
      holder.innerHTML = renderToString(<Sizes />);

      const root = holder.firstElementChild;
      expect(root).toHaveAttribute("tabindex", "0");
      expect(root).toHaveAttribute("role", "group");
      const captionId = root?.getAttribute("aria-labelledby") ?? "";
      expect(holder.querySelector(`[id="${captionId}"]`)?.tagName).toBe("CAPTION");
    });

    it("hydrates without a mismatch, then drops the Tab stop once it measures as fitting", () => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(<Sizes />);
      document.body.append(container);
      const onRecoverableError = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const { unmount } = render(<Sizes />, { container, hydrate: true, onRecoverableError });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      const root = rootOf(container);
      expect(root).toHaveAttribute("tabindex", "0");
      setOverflow(root, false);
      expect(root).not.toHaveAttribute("tabindex");

      consoleError.mockRestore();
      unmount();
      container.remove();
    });
  });

  it("is reached by Tab while it overflows, then a button in a cell, and Shift+Tab goes back", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Table caption="Actions">
        <TableBody>
          <TableRow>
            <TableHeaderCell>Row</TableHeaderCell>
            <TableCell>
              <button type="button">Edit</button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const root = rootOf(container);
    setOverflow(root, true);

    await user.tab();
    expect(root).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(root).toHaveFocus();
  });

  it("is skipped by Tab once it fits", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <Sizes />
        <button type="button">After</button>
      </>,
    );
    setOverflow(rootOf(container), false);

    await user.tab();

    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("has no axe violations fitting, overflowing, with a hidden caption, and with spanning cells and a footer", async () => {
    const { container, rerender } = render(
      <main>
        <Sizes />
      </main>,
    );
    const root = () => {
      const element = container.querySelector("main > div");
      if (!(element instanceof HTMLElement)) throw new Error("No root");
      return element;
    };

    setOverflow(root(), false);
    await expectNoAxeViolations(container);
    setOverflow(root(), true);
    await expectNoAxeViolations(container);

    rerender(
      <main>
        <Sizes hideCaption />
      </main>,
    );
    await expectNoAxeViolations(container);

    rerender(
      <main>
        <Table caption="Example build sizes">
          <TableHead>
            <TableRow>
              <TableHeaderCell rowSpan={2}>File</TableHeaderCell>
              <TableHeaderCell scope="colgroup" colSpan={2} align="center">
                Size (kB)
              </TableHeaderCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell align="end">Raw</TableHeaderCell>
              <TableHeaderCell align="end">Gzip</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell>index.js</TableHeaderCell>
              <TableCell align="end">120</TableCell>
              <TableCell align="end">40</TableCell>
            </TableRow>
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableCell align="end">120</TableCell>
              <TableCell align="end">40</TableCell>
            </TableRow>
          </TableFoot>
        </Table>
      </main>,
    );
    await expectNoAxeViolations(container);
  });
});
