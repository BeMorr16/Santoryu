import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { componentTokens, componentTokensOf } from "../tokens/metadata.ts";
import { ComponentTokenTable } from "./ComponentTokenTable.tsx";

const button = componentTokensOf("button");

function rowOf(name: string) {
  const row = document.getElementById(name.replaceAll(".", "-"));
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

describe("ComponentTokenTable", () => {
  describe("on a component page", () => {
    function renderButtonTable() {
      render(
        <MemoryRouter>
          <ComponentTokenTable
            tokens={button}
            caption="Button component tokens"
            linkBase="/design-system/tokens"
          />
        </MemoryRouter>,
      );
      return screen.getByRole("table", { name: "Button component tokens" });
    }

    it("shows every token with its alias and both themes (R14.3)", () => {
      const table = renderButtonTable();

      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual(["Token", "Copy", "Description", "Aliases", "Light", "Dark", "Preview"]);
      const rows = within(table).getAllByRole("rowheader");
      expect(rows.map((row) => row.querySelector("code")?.textContent)).toEqual(
        button.map((token) => token.cssVar),
      );
      for (const token of button) {
        const row = rowOf(token.name);
        expect(row).toHaveTextContent(token.aliases);
        expect(row).toHaveTextContent(token.values.light.css);
        expect(row).toHaveTextContent(token.values.dark.css);
      }
    });

    it("gives every row a copy button for its variable, outside the row header (R8.2)", () => {
      renderButtonTable();

      for (const token of button) {
        expect(within(rowOf(token.name)).getByRole("rowheader")).toHaveAccessibleName(token.cssVar);
        expect(rowOf(token.name)).toHaveTextContent(token.description);
        expect(
          within(rowOf(token.name)).getByRole("button", { name: `Copy ${token.cssVar}` }),
        ).toBeInTheDocument();
      }
    });

    it("links aliases and primitives to their rows on /design-system/tokens (R6.3)", () => {
      renderButtonTable();
      const [token] = button;
      if (!token) throw new Error("Button has tokens");

      const row = rowOf(token.name);
      expect(within(row).getByRole("link", { name: token.aliases })).toHaveAttribute(
        "href",
        `/design-system/tokens#${token.aliases.replaceAll(".", "-")}`,
      );
      expect(within(row).getAllByRole("link", { name: token.values.light.ref })[0]).toHaveAttribute(
        "href",
        `/design-system/tokens#${token.values.light.ref.replaceAll(".", "-")}`,
      );
    });
  });

  describe("on the tokens page", () => {
    const colors = componentTokens.filter((token) => token.category === "radius");

    function renderCategory() {
      render(
        <MemoryRouter>
          <ComponentTokenTable tokens={colors} caption="Radius" hideCaption showComponent />
        </MemoryRouter>,
      );
      return screen.getByRole("table", { name: "Radius" });
    }

    it("adds a Component column linking to each component page's tokens (R6.2)", () => {
      const table = renderCategory();

      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual([
        "Token",
        "Copy",
        "Component",
        "Description",
        "Aliases",
        "Light",
        "Dark",
        "Preview",
      ]);
      const token = colors.find((candidate) => candidate.component === "button");
      if (!token) throw new Error("Button has a radius token");
      expect(within(rowOf(token.name)).getByRole("link", { name: "Button" })).toHaveAttribute(
        "href",
        "/design-system/components/button#component-tokens",
      );
    });

    it("links aliases within the page", () => {
      renderCategory();
      const [token] = colors;
      if (!token) throw new Error("expected radius tokens");

      expect(within(rowOf(token.name)).getByRole("link", { name: token.aliases })).toHaveAttribute(
        "href",
        `#${token.aliases.replaceAll(".", "-")}`,
      );
    });
  });
});
