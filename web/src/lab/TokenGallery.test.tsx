import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { resize } from "../../test/resize-observer.ts";
import hiddenStyles from "../components/VisuallyHidden/VisuallyHidden.module.css";
import { componentTokensOf, semanticTokens as semantic } from "../tokens/metadata.ts";
import { tokenCategories, type SemanticTokenMeta } from "../tokens/types.ts";
import { TokenGallery, tokenizedComponents } from "./TokenGallery.tsx";

const labels = {
  color: "Color",
  type: "Type",
  space: "Space",
  size: "Size",
  radius: "Radius",
  motion: "Motion",
  effect: "Effect",
  layer: "Layer",
} as const;

const tokensIn = (category: string): readonly SemanticTokenMeta[] =>
  semantic.filter((token) => token.category === category);

function tableFor(category: keyof typeof labels) {
  return screen.getByRole("table", { name: `${labels[category]} tokens` });
}

/** A table's scroll box: the Table root around it. */
function scrollBoxOf(table: HTMLElement) {
  const root = table.parentElement;
  if (!root) throw new Error("No scroll box");
  return root;
}

/** Gives a scroll box a layout (jsdom has none) and reports a resize to its observer. */
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

function rowFor(token: SemanticTokenMeta) {
  const table = tableFor(token.category);
  const header = within(table).getByRole("rowheader", { name: token.cssVar });
  const row = header.closest("tr");
  if (!row) throw new Error(`No row for ${token.cssVar}`);
  return row;
}

describe("TokenGallery", () => {
  it("renders one h2 per category, in order, then Component tokens", () => {
    render(<TokenGallery />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      ...tokenCategories.map((category) => labels[category]),
      "Component tokens",
    ]);
  });

  it("lists every component with tokens under Component tokens, one h3 and table each (R14.3)", () => {
    render(<TokenGallery />);

    const section = screen.getByRole("region", { name: "Component tokens" });
    expect(tokenizedComponents.length).toBeGreaterThan(0);
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(tokenizedComponents);
  });

  it.each(tokenizedComponents)(
    "shows every %s component token with its alias and both themes",
    (component) => {
      render(<TokenGallery />);

      const table = screen.getByRole("table", { name: `${component} component tokens` });
      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((h) => h.textContent),
      ).toEqual(["Token", "Aliases", "Light", "Dark", "Preview"]);
      const tokens = componentTokensOf(component);
      const rows = within(table).getAllByRole("rowheader");
      expect(rows.map((row) => row.querySelector("code")?.textContent)).toEqual(
        tokens.map((t) => t.cssVar),
      );
      for (const [index, token] of tokens.entries()) {
        const row = rows[index]?.closest("tr");
        expect(row).toHaveTextContent(token.aliases);
        expect(row).toHaveTextContent(token.values.light.css);
        expect(row).toHaveTextContent(token.values.dark.css);
      }
    },
  );

  it("labels each category section with its heading", () => {
    render(<TokenGallery />);

    for (const category of tokenCategories) {
      expect(screen.getByRole("region", { name: labels[category] })).toContainElement(
        tableFor(category),
      );
    }
  });

  it.each(tokenCategories)(
    "wraps the %s table in a scroll box that's a group named by its caption only while it overflows (refinement R16.6)",
    (category) => {
      render(<TokenGallery />);
      const root = scrollBoxOf(tableFor(category));

      setOverflow(root, true);
      expect(screen.getByRole("group", { name: `${labels[category]} tokens` })).toBe(root);
      expect(root).toHaveAttribute("tabindex", "0");

      setOverflow(root, false);
      expect(root).not.toHaveAttribute("tabindex");
      expect(root).not.toHaveAttribute("role");
    },
  );

  it("hides every caption, since the heading right above names each table (refinement R16.11)", () => {
    render(<TokenGallery />);

    const captions = [...document.querySelectorAll("caption")];
    expect(captions).toHaveLength(tokenCategories.length + tokenizedComponents.length);
    for (const caption of captions) expect(caption).toHaveClass(hiddenStyles.root ?? "");
  });

  it("lets keyboard users reach an overflowing table with Tab, skipping the ones that fit", async () => {
    const user = userEvent.setup();
    render(<TokenGallery />);
    const roots = screen.getAllByRole("table").map(scrollBoxOf);
    for (const root of roots) setOverflow(root, false);
    const type = scrollBoxOf(tableFor("type"));
    setOverflow(type, true);

    await user.tab();

    expect(screen.getByRole("group", { name: "Type tokens" })).toHaveFocus();
    expect(screen.getAllByRole("group")).toEqual([type]);
  });

  it.each(tokenCategories)("gives the %s table a caption and column headers", (category) => {
    render(<TokenGallery />);

    const themed = tokensIn(category).some((token) => token.themed);
    const expected = themed
      ? ["Token", "Description", "Light", "Dark", "Preview"]
      : ["Token", "Description", "Value", "Preview"];
    const headers = within(tableFor(category)).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual(expected);
  });

  it.each(tokenCategories)("lists every %s semantic token, one row each", (category) => {
    render(<TokenGallery />);

    const rowHeaders = within(tableFor(category)).getAllByRole("rowheader");
    expect(rowHeaders.map((header) => header.textContent)).toEqual(
      tokensIn(category).map((token) => token.cssVar),
    );
  });

  it.each(semantic.map((token) => [token.cssVar, token] as const))(
    "shows %s with its description and value text",
    (_name, token) => {
      render(<TokenGallery />);

      const row = rowFor(token);
      expect(row).toHaveTextContent(token.description);
      if (token.themed) {
        expect(row).toHaveTextContent(token.values.light.css);
        expect(row).toHaveTextContent(`from ${token.values.light.ref}`);
        expect(row).toHaveTextContent(token.values.dark.css);
        expect(row).toHaveTextContent(`from ${token.values.dark.ref}`);
      } else {
        expect(row).toHaveTextContent(token.values.all.css);
        expect(row).toHaveTextContent(`from ${token.values.all.ref}`);
        const sharesThemedTable = tokensIn(token.category).some((t) => t.themed);
        if (sharesThemedTable) expect(row).toHaveTextContent("Both themes");
        if ("reduced" in token.values) {
          expect(row).toHaveTextContent(`Reduced motion: ${token.values.reduced.css}`);
        }
      }
    },
  );

  it.each(semantic.map((token) => [token.cssVar, token] as const))(
    "renders the %s preview as a hidden specimen styled by the token, or a dash for motion, layer, breakpoints and the measure",
    (_name, token) => {
      render(<TokenGallery />);

      const preview = within(rowFor(token)).getAllByRole("cell").at(-1);
      if (
        token.category === "motion" ||
        token.category === "layer" ||
        token.name.startsWith("size.breakpoint.") ||
        token.name.startsWith("type.measure.")
      ) {
        expect(preview).toHaveTextContent("—");
        expect(preview).toHaveTextContent("No preview");
        expect(preview?.querySelector("[style]")).toBeNull();
        return;
      }
      const specimen = preview?.firstElementChild;
      expect(specimen).toHaveAttribute("aria-hidden", "true");
      expect((specimen as HTMLElement | null)?.style.getPropertyValue("--specimen")).toBe(
        `var(${token.cssVar})`,
      );
    },
  );
});
