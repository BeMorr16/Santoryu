import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { semanticTokens } from "../tokens/metadata.ts";
import { primitiveTokens } from "../tokens/primitives.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./Specimen.module.css";

const primitive = (name: string) => {
  const token = primitiveTokens.find((candidate) => candidate.name === name);
  if (!token) throw new Error(`No primitive ${name}`);
  return token;
};

describe("Specimen (ds-tokens §6.3)", () => {
  it("styles a semantic token with its own custom property", () => {
    const token = semanticTokens.find((candidate) => candidate.name === "color.text.muted");
    if (!token) throw new Error("No color.text.muted");
    const { container } = render(<Specimen token={token} />);

    const specimen = container.firstElementChild as HTMLElement;
    expect(specimen.style.getPropertyValue("--specimen")).toBe("var(--color-text-muted)");
    expect(specimen).toHaveClass(styles.swatch ?? "");
  });

  it("styles a primitive with its literal value, since it has no custom property", () => {
    const token = primitive("color.blue.600");
    const { container } = render(<Specimen token={token} />);

    const specimen = container.firstElementChild as HTMLElement;
    expect(specimen).toHaveAttribute("aria-hidden", "true");
    expect(specimen.style.getPropertyValue("--specimen")).toBe(token.css);
    expect(specimen).toHaveClass(styles.swatch ?? "");
  });

  it("previews a primitive like the first semantic token aliasing it", () => {
    const fontSizes = primitiveTokens.filter((token) => token.name.startsWith("type.font-size."));
    expect(fontSizes.length).toBeGreaterThan(0);
    for (const token of fontSizes.filter((candidate) => candidate.usedBy.length > 0)) {
      const { container, unmount } = render(<Specimen token={token} />);
      expect(container.firstElementChild).toHaveClass(styles.fontSize ?? "");
      unmount();
    }
  });

  it("gives size.120 no preview, like the breakpoint aliasing it", () => {
    const { container } = render(<Specimen token={primitive("size.120")} />);

    expect(container).toHaveTextContent("No preview");
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("falls back to the category for an unused primitive", () => {
    const unused = primitive("space.0");
    expect(unused.usedBy).toEqual([]);
    const { container } = render(<Specimen token={unused} />);

    expect(container.firstElementChild).toHaveClass(styles.bar ?? "");
  });

  it("adds a className", () => {
    const { container } = render(<Specimen token={primitive("color.blue.600")} className="x" />);

    expect(container.firstElementChild).toHaveClass("x", styles.swatch ?? "");
  });
});
