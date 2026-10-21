import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Stack } from "../Stack/Stack.tsx";
import { Separator } from "./Separator.tsx";
import styles from "./Separator.module.css";

describe("Separator", () => {
  it("is a horizontal, subtle hr with the separator role by default (refinement R17.2, R17.3, R17.5)", () => {
    render(<Separator />);

    const separator = screen.getByRole("separator");
    expect(separator.tagName).toBe("HR");
    expect(separator).not.toHaveAttribute("aria-orientation");
    expect(separator).not.toHaveAttribute("aria-hidden");
    expect(separator).toHaveClass(
      styles.separator ?? "",
      styles.horizontal ?? "",
      styles.subtle ?? "",
      styles.thin ?? "",
    );
  });

  it("says its orientation when vertical (refinement R17.3)", () => {
    render(<Separator orientation="vertical" />);

    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveClass(styles.vertical ?? "");
  });

  it.each(["horizontal", "vertical"] as const)(
    "is an empty div hidden from assistive technology when decorative and %s (refinement R17.2)",
    (orientation) => {
      const { container } = render(<Separator decorative orientation={orientation} />);

      const separator = container.firstElementChild;
      expect(separator?.tagName).toBe("DIV");
      expect(separator).toHaveAttribute("aria-hidden", "true");
      expect(separator).not.toHaveAttribute("role");
      expect(separator).not.toHaveAttribute("aria-orientation");
      expect(separator).toBeEmptyDOMElement();
      expect(screen.queryByRole("separator", { hidden: true })).toBeNull();
      expect(separator).toHaveClass(styles[orientation] ?? "");
    },
  );

  it("applies the strong variant (refinement R17.5)", () => {
    render(<Separator variant="strong" />);

    const separator = screen.getByRole("separator");
    expect(separator).toHaveClass(styles.strong ?? "");
    expect(separator).not.toHaveClass(styles.subtle ?? "");
  });

  it("applies the thick thickness (refinement R17.5)", () => {
    render(<Separator thickness="thick" />);

    const separator = screen.getByRole("separator");
    expect(separator).toHaveClass(styles.thick ?? "");
    expect(separator).not.toHaveClass(styles.thin ?? "");
  });

  it.each([false, true])(
    "passes className, native props and ref to its element (decorative: %s) (refinement R17.1)",
    (decorative) => {
      const ref = createRef<HTMLElement>();
      const { container } = render(
        <Separator
          ref={ref}
          decorative={decorative}
          id="rule"
          data-testid="rule"
          className="custom"
        />,
      );

      const separator = container.firstElementChild;
      expect(separator).toHaveAttribute("id", "rule");
      expect(separator).toHaveAttribute("data-testid", "rule");
      expect(separator).toHaveClass("custom", styles.separator ?? "");
      expect(ref.current).toBe(separator);
      expect(ref.current?.tagName).toBe(decorative ? "DIV" : "HR");
    },
  );

  it.each([false, true])(
    "is never focusable, so Tab goes past it (decorative: %s) (refinement R17.2)",
    async (decorative) => {
      const user = userEvent.setup();
      const { container } = render(
        <>
          <button type="button">Before</button>
          <Separator decorative={decorative} />
          <button type="button">After</button>
        </>,
      );

      expect(container.querySelector("hr, div")).not.toHaveAttribute("tabindex");
      await user.tab();
      expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    },
  );

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <div>
        <Separator />
        <Separator orientation="vertical" variant="strong" thickness="thick" />
        <Separator decorative />
      </div>,
    );
  });

  it("has no axe violations horizontal, vertical, and decorative in a horizontal Stack (R3.9)", async () => {
    const { container } = render(
      <div>
        <p>One topic.</p>
        <Separator />
        <p>Another topic.</p>
        <Stack direction="horizontal" gap="sm" align="center">
          <span>Home</span>
          <Separator orientation="vertical" />
          <span>Lab</span>
        </Stack>
        <Stack direction="horizontal" gap="sm" align="center">
          <span>21 Oct 2026</span>
          <Separator orientation="vertical" decorative />
          <span>5 min read</span>
          <Separator orientation="vertical" decorative variant="strong" />
          <span>Design</span>
        </Stack>
      </div>,
    );

    await expectNoAxeViolations(container);
  });
});
