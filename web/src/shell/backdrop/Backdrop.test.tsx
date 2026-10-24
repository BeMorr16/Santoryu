import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Backdrop } from "./Backdrop.tsx";
import styles from "./Backdrop.module.css";

const focusable = "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

describe("Backdrop", () => {
  it("renders the quiet kind as one hidden layer with no canvas (R4.1, R4.2)", () => {
    const { container } = render(<Backdrop kind="quiet" />);

    expect(container.children).toHaveLength(1);
    const layer = container.firstElementChild;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass(styles.layer ?? "", styles.quiet ?? "");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders the striking kind as a hidden canvas (R2.1)", () => {
    const { container } = render(<Backdrop kind="striking" />);

    expect(container.children).toHaveLength(1);
    const canvas = container.firstElementChild;
    expect(canvas?.tagName).toBe("CANVAS");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass(styles.layer ?? "");
    expect(canvas).not.toHaveClass(styles.quiet ?? "");
  });

  it.each(["quiet", "striking"] as const)(
    "keeps the %s kind out of the tab order and passes axe (R6.1)",
    async (kind) => {
      const { container } = render(<Backdrop kind={kind} />);

      expect(container.querySelectorAll(focusable)).toHaveLength(0);
      expect(container.firstElementChild?.childElementCount).toBe(0);
      await expectNoAxeViolations(container);
    },
  );
});
