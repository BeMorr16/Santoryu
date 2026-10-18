import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Icon } from "./Icon.tsx";
import styles from "./Icon.module.css";
import { icons, weightMap, type IconName } from "./registry.ts";

const names = Object.keys(icons) as IconName[];

describe("Icon", () => {
  it.each(names)("renders %s as a decorative, unfocusable svg by default (R6.2)", (name) => {
    const { container } = render(<Icon name={name} />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("with a label, is an image named by it (R6.3)", () => {
    render(<Icon name="github" label="GitHub" />);

    const image = screen.getByRole("img", { name: "GitHub" });
    expect(image).not.toHaveAttribute("aria-hidden");
    expect(image.querySelector("title")).toBeNull();
  });

  it("colors itself with currentColor (R6.4)", () => {
    const { container } = render(<Icon name="check" />);

    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  });

  it.each(["inherit", "sm", "md", "lg"] as const)("applies the %s size class (R6.4)", (size) => {
    const { container } = render(<Icon name="check" size={size} />);

    expect(container.querySelector("svg")).toHaveClass(
      styles.icon ?? "",
      styles[`size-${size}`] ?? "",
    );
  });

  it("defaults to the inherit (1em) size and the regular weight", () => {
    const { container } = render(<Icon name="theme-light" />);

    expect(container.querySelector("svg")).toHaveClass(styles["size-inherit"] ?? "");
    expect(container.innerHTML).toBe(
      render(<Icon name="theme-light" weight="regular" />).container.innerHTML,
    );
  });

  it.each(Object.entries(weightMap))(
    "maps weight %s onto the family's %s glyphs (R6.5)",
    (ours, theirs) => {
      const Glyph = icons["theme-light"];
      const glyph = (markup: string) => markup.replace(/^<svg[^>]*>/, "");

      expect(
        glyph(
          renderToStaticMarkup(<Icon name="theme-light" weight={ours as keyof typeof weightMap} />),
        ),
      ).toBe(glyph(renderToStaticMarkup(<Glyph weight={theirs} />)));
    },
  );

  it("draws different glyphs for different weights", () => {
    const light = renderToStaticMarkup(<Icon name="theme-light" weight="light" />);
    const bold = renderToStaticMarkup(<Icon name="theme-light" weight="bold" />);

    expect(light).not.toBe(bold);
  });

  it("puts ref, rest props and className on the svg, keeping its own classes (R3.2, R3.3)", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <Icon name="mail" ref={ref} data-kind="contact" className="extra" />,
    );

    const svg = container.querySelector("svg");
    expect(ref.current).toBe(svg);
    expect(svg).toHaveAttribute("data-kind", "contact");
    expect(svg).toHaveClass("extra", styles.icon ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<Icon name="mail" size="lg" label="Email" />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(<Icon name="theme-dark" label="Dark" />);
  });

  it("has no axe violations, decorative or labelled (R3.9)", async () => {
    const { container } = render(
      <p>
        <Icon name="check" /> Done <Icon name="github" label="GitHub" />
      </p>,
    );

    await expectNoAxeViolations(container);
  });
});
