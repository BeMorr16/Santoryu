import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { primitiveTokens } from "../../tokens/primitives.ts";
import { ColorRamps } from "./ColorRamps.tsx";
import styles from "./ColorRamps.module.css";

const colors = primitiveTokens.filter((token) => token.category === "color");
const hues = [...new Set(colors.map((token) => token.group))];

describe("ColorRamps (ds-tokens R5.3)", () => {
  it("shows one ramp per hue, in source order, each under an h4", () => {
    render(<ColorRamps tokens={colors} />);

    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(hues);
    expect(hues).toContain("overlay");
  });

  it("lists every step with its id, step name, value and users", () => {
    render(<ColorRamps tokens={colors} />);

    for (const token of colors) {
      const step = document.getElementById(token.name.replaceAll(".", "-"));
      expect(step?.tagName).toBe("LI");
      if (!step) continue;
      expect(step).toHaveTextContent(token.name.split(".").at(-1) ?? "");
      expect(step).toHaveTextContent(token.css);
      if (token.usedBy.length === 0) expect(step).toHaveTextContent("Not used");
      else {
        expect(
          within(step)
            .getAllByRole("link")
            .map((link) => link.textContent),
        ).toEqual(token.usedBy);
      }
    }
  });

  it("puts only the overlay swatches on a checkerboard", () => {
    const { container } = render(<ColorRamps tokens={colors} />);

    const checkered = [...container.querySelectorAll(`.${styles.checkerboard ?? ""}`)];
    expect(checkered).toHaveLength(colors.filter((token) => token.group === "overlay").length);
    for (const swatch of checkered) {
      expect(swatch.closest("li")?.id).toMatch(/^color-overlay-/);
      expect(swatch).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("hides steps, and whole ramps, outside the search results (R11.3)", () => {
    render(<ColorRamps tokens={colors} shown={new Set(["color-gold-700"])} />);

    expect(document.getElementById("color-gold-700")).toBeVisible();
    expect(document.getElementById("color-gold-600")).not.toBeVisible();
    expect(screen.getByRole("heading", { name: "gold" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "cyan" })).toBeNull();
  });
});
