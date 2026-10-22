import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { primitiveTokens } from "../../tokens/primitives.ts";
import { PrimitiveTable } from "./PrimitiveTable.tsx";

const spaces = primitiveTokens.filter((token) => token.category === "space");

describe("PrimitiveTable (ds-tokens R5.2, R5.4, R5.5)", () => {
  it("has Token, Value, Preview and Used by columns, and no copy buttons", () => {
    render(<PrimitiveTable caption="Space primitives" tokens={spaces} />);
    const table = screen.getByRole("table", { name: "Space primitives" });

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Token", "Value", "Preview", "Used by"]);
    expect(within(table).queryAllByRole("button")).toEqual([]);
  });

  it("gives each primitive a row with its id, path and value", () => {
    render(<PrimitiveTable caption="Space primitives" tokens={spaces} />);

    for (const token of spaces) {
      const row = document.getElementById(token.name.replaceAll(".", "-"));
      expect(row?.tagName).toBe("TR");
      if (!row) continue;
      expect(within(row).getByRole("rowheader")).toHaveTextContent(token.name);
      expect(row).toHaveTextContent(token.css);
    }
  });

  it("links every semantic token using a primitive, or says Not used", () => {
    render(<PrimitiveTable caption="Space primitives" tokens={spaces} />);
    const used = spaces.find((token) => token.usedBy.length > 0);
    const unused = spaces.find((token) => token.usedBy.length === 0);
    if (!used || !unused) throw new Error("expected used and unused space primitives");

    const usedRow = document.getElementById(used.name.replaceAll(".", "-"));
    if (!usedRow) throw new Error("no row");
    const list = within(usedRow).getByRole("list", { name: "Used by" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(used.usedBy.map((name) => [name, `#${name.replaceAll(".", "-")}`]));
    expect(document.getElementById(unused.name.replaceAll(".", "-"))).toHaveTextContent("Not used");
  });
});
