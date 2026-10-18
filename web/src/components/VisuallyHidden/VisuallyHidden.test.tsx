import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { VisuallyHidden } from "./VisuallyHidden.tsx";
import styles from "./VisuallyHidden.module.css";

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

  it("renders a span by default and another element with `as` (R7.3)", () => {
    render(
      <>
        <VisuallyHidden>One</VisuallyHidden>
        <VisuallyHidden as="p">Two</VisuallyHidden>
      </>,
    );

    expect(screen.getByText("One").tagName).toBe("SPAN");
    expect(screen.getByText("Two").tagName).toBe("P");
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
    expect(link.matches(".focusable:focus-within, :focus-within")).toBe(true);
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
