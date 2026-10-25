import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { VisuallyHidden, type VisuallyHiddenElement } from "./VisuallyHidden.tsx";
import styles from "./VisuallyHidden.module.css";

// Every element in the `as` union (refinement R2.6, R12.11).
const elements = [
  "span",
  "div",
  "p",
  "a",
  "label",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "small",
  "mark",
  "s",
  "legend",
  "code",
  "kbd",
  "samp",
  "abbr",
  "cite",
  "q",
  "time",
  "blockquote",
  "figcaption",
  "caption",
  "li",
  "dt",
  "dd",
] as const satisfies readonly VisuallyHiddenElement[];

describe("VisuallyHidden", () => {
  it("keeps its content in the accessibility tree, clipped by the hidden class (R7.1)", () => {
    render(
      <button type="button">
        <span aria-hidden="true">×</span>
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>,
    );

    const button = screen.getByRole("button", { name: "Close dialog" });
    const hidden = screen.getByText("Close dialog");
    expect(button).toContainElement(hidden);
    expect(hidden).toHaveClass(styles.root ?? "");
    expect(hidden).not.toHaveClass(styles.focusable ?? "");
  });

  it("renders a span by default (R7.3)", () => {
    render(<VisuallyHidden>One</VisuallyHidden>);

    expect(screen.getByText("One").tagName).toBe("SPAN");
  });

  const parents: Partial<Record<VisuallyHiddenElement, (child: ReactNode) => ReactNode>> = {
    li: (child) => <ul>{child}</ul>,
    dt: (child) => <dl>{child}</dl>,
    dd: (child) => <dl>{child}</dl>,
    figcaption: (child) => <figure>{child}</figure>,
    caption: (child) => <table>{child}</table>,
    legend: (child) => <fieldset>{child}</fieldset>,
  };

  it("tests every element in the `as` union", () => {
    expectTypeOf<(typeof elements)[number]>().toEqualTypeOf<VisuallyHiddenElement>();
  });

  it.each(elements)("renders <%s> with `as` (refinement R2.6)", (element) => {
    const hidden =
      element === "a" ? (
        <VisuallyHidden as="a" focusable href="#main">
          Hidden
        </VisuallyHidden>
      ) : (
        <VisuallyHidden as={element}>Hidden</VisuallyHidden>
      );
    render(<>{parents[element]?.(hidden) ?? hidden}</>);

    const root = screen.getByText("Hidden");
    expect(root.tagName).toBe(element.toUpperCase());
    expect(root).toHaveClass(styles.root ?? "");
  });

  it("names a field as a hidden label, and a table as a hidden caption (refinement R2.6)", () => {
    render(
      <>
        <VisuallyHidden as="label" htmlFor="search">
          Search the design system
        </VisuallyHidden>
        <input id="search" type="search" />
        <table>
          <VisuallyHidden as="caption">Token values</VisuallyHidden>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </>,
    );

    expect(screen.getByRole("searchbox", { name: "Search the design system" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Token values" })).toBeInTheDocument();
  });

  it("with `focusable`, is reachable by Tab and marked to show while focused (R7.2)", async () => {
    const user = userEvent.setup();
    render(
      <VisuallyHidden as="a" focusable href="#main">
        Skip to main content
      </VisuallyHidden>,
    );

    await user.tab();

    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveFocus();
    expect(link).toHaveClass(styles.focusable ?? "");
  });

  it("shows while a focusable descendant has focus (R7.2)", async () => {
    const user = userEvent.setup();
    render(
      <VisuallyHidden as="div" focusable data-testid="wrapper">
        <a href="#main">Skip to main content</a>
      </VisuallyHidden>,
    );

    await user.tab();

    const wrapper = screen.getByRole("link").parentElement;
    expect(wrapper).toHaveClass(styles.focusable ?? "");
    expect(wrapper?.matches(":focus-within")).toBe(true);
  });

  it("puts ref, rest props and className on the root, keeping its own class (R3.2, R3.3)", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <VisuallyHidden ref={ref} id="note" data-kind="hint" className="extra">
        Hint
      </VisuallyHidden>,
    );

    const root = screen.getByText("Hint");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "note");
    expect(root).toHaveAttribute("data-kind", "hint");
    expect(root).toHaveClass("extra", styles.root ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<VisuallyHidden focusable>Hint</VisuallyHidden>);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(<VisuallyHidden focusable>Hint</VisuallyHidden>);
  });

  it("has no axe violations, plain or focusable (R3.9)", async () => {
    const { container } = render(
      <main>
        <p>
          Read more<VisuallyHidden> about tokens</VisuallyHidden>
        </p>
        <VisuallyHidden as="a" focusable href="#main">
          Skip to main content
        </VisuallyHidden>
      </main>,
    );

    await expectNoAxeViolations(container);
  });
});
