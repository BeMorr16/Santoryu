import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Backdrop } from "./Backdrop.tsx";
import styles from "./Backdrop.module.css";

const focusable = "a[href], button, input, select, textarea, [tabindex], [contenteditable]";

describe("Backdrop", () => {
  it("renders the quiet kind as the frame alone, with no canvas (R4.1, R4.2)", () => {
    const { container } = render(<Backdrop kind="quiet" />);

    expect(container.children).toHaveLength(1);
    const frame = container.firstElementChild;
    expect(frame?.tagName).toBe("DIV");
    expect(frame).toHaveAttribute("aria-hidden", "true");
    expect(frame).toHaveClass(styles.layer ?? "", styles.frameGlow ?? "");
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders the striking kind as the frame, then a hidden canvas over it (backdrop-layers R1.1, R1.3)", () => {
    const { container } = render(<Backdrop kind="striking" />);

    const [frame, canvas, ...rest] = [...container.children];
    expect(rest).toEqual([]);
    expect(frame?.tagName).toBe("DIV");
    expect(frame).toHaveClass(styles.layer ?? "", styles.frameGlow ?? "");
    expect(canvas?.tagName).toBe("CANVAS");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass(styles.layer ?? "");
    expect(canvas).not.toHaveClass(styles.frameGlow ?? "");
  });

  it("draws the same frame for both kinds (backdrop-layers R1.2)", () => {
    const quiet = render(<Backdrop kind="quiet" />).container.firstElementChild;
    const striking = render(<Backdrop kind="striking" />).container.firstElementChild;

    expect(striking?.outerHTML).toBe(quiet?.outerHTML);
  });

  it("keeps the frame node when the kind changes (backdrop-layers R1.5)", () => {
    const { container, rerender } = render(<Backdrop kind="quiet" />);
    const frame = container.firstElementChild;

    rerender(<Backdrop kind="striking" />);
    expect(container.firstElementChild).toBe(frame);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);

    rerender(<Backdrop kind="quiet" />);
    expect(container.firstElementChild).toBe(frame);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it.each(["quiet", "striking"] as const)(
    "keeps the %s kind out of the tab order and passes axe (R6.1)",
    async (kind) => {
      const { container } = render(<Backdrop kind={kind} />);

      expect(container.querySelectorAll(focusable)).toHaveLength(0);
      for (const layer of container.children) expect(layer.childElementCount).toBe(0);
      await expectNoAxeViolations(container);
    },
  );
});
