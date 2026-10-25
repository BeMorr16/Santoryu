import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { semanticTokens } from "../../tokens/metadata.ts";
import { tokenCategories } from "../../tokens/types.ts";
import hiddenStyles from "../../components/VisuallyHidden/VisuallyHidden.module.css";
import { SemanticTokenTable } from "./SemanticTokenTable.tsx";

const inCategory = (category: string) =>
  semanticTokens.filter((token) => token.category === category);

function renderTable(category: string, shown?: ReadonlySet<string>) {
  render(<SemanticTokenTable caption="Tokens" tokens={inCategory(category)} shown={shown} />);
  return screen.getByRole("table", { name: "Tokens" });
}

function rowOf(cssVar: string) {
  const row = document.getElementById(cssVar.slice(2));
  if (!row) throw new Error(`No row for ${cssVar}`);
  return row;
}

describe("SemanticTokenTable (ds-tokens R6.1)", () => {
  it("has Light and Dark columns for themed tokens, one Value column otherwise", () => {
    expect(
      within(renderTable("color"))
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Token", "Copy", "Description", "Light", "Dark", "Preview"]);
  });

  it("has one Value column for an unthemed category", () => {
    expect(
      within(renderTable("space"))
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Token", "Copy", "Description", "Value", "Preview"]);
  });

  it("gives every row its token's fragment id and a copy button for its variable (R6.4, R8.2)", () => {
    const table = renderTable("color");

    for (const token of inCategory("color")) {
      const row = rowOf(token.cssVar);
      expect(table).toContainElement(row);
      expect(within(row).getByRole("rowheader")).toHaveAccessibleName(token.cssVar);
      expect(within(row).getByRole("button", { name: `Copy ${token.cssVar}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Copy --color-text-muted" })).toBeInTheDocument();
  });

  it("links each value's primitive to its row (R6.3)", () => {
    renderTable("color");
    const token = inCategory("color").find((candidate) => candidate.themed);
    if (!token?.themed) throw new Error("expected a themed color");

    const row = rowOf(token.cssVar);
    const light = within(row).getAllByRole("link", { name: token.values.light.ref })[0];
    expect(light).toHaveAttribute("href", `#${token.values.light.ref.replaceAll(".", "-")}`);
    expect(
      within(row).getAllByRole("link", { name: token.values.dark.ref }).at(-1),
    ).toHaveAttribute("href", `#${token.values.dark.ref.replaceAll(".", "-")}`);
  });

  it("links the reduced-motion primitive too", () => {
    renderTable("motion");
    const token = inCategory("motion").find(
      (candidate) => !candidate.themed && candidate.values.reduced,
    );
    if (token?.themed !== false || !token.values.reduced) throw new Error("expected reduced");

    const row = rowOf(token.cssVar);
    expect(row).toHaveTextContent(`Reduced motion: ${token.values.reduced.css}`);
    expect(within(row).getByRole("link", { name: token.values.reduced.ref })).toHaveAttribute(
      "href",
      `#${token.values.reduced.ref.replaceAll(".", "-")}`,
    );
  });

  it("hides rows outside the search results (R11.3)", () => {
    renderTable("radius", new Set(["radius-control"]));

    expect(rowOf("--radius-control")).toBeVisible();
    expect(rowOf("--radius-surface")).not.toBeVisible();
  });

  // Carried over from TokenGallery.test.tsx.
  it.each(tokenCategories)("lists every %s semantic token, one row each", (category) => {
    const table = renderTable(category);

    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((header) => header.querySelector("code")?.textContent),
    ).toEqual(inCategory(category).map((token) => token.cssVar));
  });

  it.each(tokenCategories)(
    "shows each %s token's description and values, and a specimen styled by it or a dash",
    (category) => {
      renderTable(category);
      const sharesThemedTable = inCategory(category).some((t) => t.themed);

      for (const token of inCategory(category)) {
        const row = rowOf(token.cssVar);
        expect(row).toHaveTextContent(token.description);
        if (token.themed) {
          expect(row).toHaveTextContent(token.values.light.css);
          expect(row).toHaveTextContent(`from ${token.values.light.ref}`);
          expect(row).toHaveTextContent(token.values.dark.css);
          expect(row).toHaveTextContent(`from ${token.values.dark.ref}`);
        } else {
          expect(row).toHaveTextContent(token.values.all.css);
          expect(row).toHaveTextContent(`from ${token.values.all.ref}`);
          if (sharesThemedTable) expect(row).toHaveTextContent("Both themes");
          if (token.values.reduced) {
            expect(row).toHaveTextContent(`Reduced motion: ${token.values.reduced.css}`);
          }
        }
        const preview = within(row).getAllByRole("cell").at(-1);
        if (
          token.category === "motion" ||
          token.category === "layer" ||
          token.name.startsWith("size.breakpoint.") ||
          token.name.startsWith("size.viewport.") ||
          token.name.startsWith("type.measure.")
        ) {
          expect(preview).toHaveTextContent("No preview");
          expect(preview?.querySelector("[style]")).toBeNull();
          continue;
        }
        const specimen = preview?.firstElementChild as HTMLElement | null | undefined;
        expect(specimen).toHaveAttribute("aria-hidden", "true");
        expect(specimen?.style.getPropertyValue("--specimen")).toBe(`var(${token.cssVar})`);
      }
    },
  );

  it("hides its caption, since the group heading above names it (refinement R16.11)", () => {
    renderTable("color");

    const caption = document.querySelector("caption");
    expect(caption).toHaveTextContent("Tokens");
    expect(caption).toHaveClass(hiddenStyles.root ?? "");
  });
});
