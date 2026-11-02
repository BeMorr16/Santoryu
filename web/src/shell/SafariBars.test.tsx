import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../test/axe.ts";
import { SafariBars } from "./SafariBars.tsx";
import styles from "./SafariBars.module.css";

describe("SafariBars", () => {
  it("renders a top and a bottom strip, empty and hidden from assistive technology", () => {
    const { container } = render(<SafariBars />);

    const strips = [...container.children];
    expect(strips.map((strip) => strip.className)).toEqual([
      expect.stringContaining(styles.top ?? "top"),
      expect.stringContaining(styles.bottom ?? "bottom"),
    ]);
    for (const strip of strips) {
      expect(strip).toHaveAttribute("aria-hidden", "true");
      expect(strip).toHaveClass(styles.edge ?? "");
      expect(strip).toBeEmptyDOMElement();
    }
  });

  it("passes axe", async () => {
    const { container } = render(<SafariBars />);

    await expectNoAxeViolations(container);
  });
});
