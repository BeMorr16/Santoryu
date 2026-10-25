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
  it("names its icons by shape (refinement R1.3)", () => {
    expect(names.toSorted()).toEqual([
      "arrow-left",
      "arrow-right",
      "arrow-up",
      "check",
      "chevron-down",
      "close",
      "copy",
      "download",
      "external-link",
      "github",
      "linkedin",
      "mail",
      "menu",
      "moon",
      "palette",
      "pause",
      "play",
      "reset",
      "search",
      "sun",
      "trash",
      "upload",
      "warning",
    ]);
  });

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
    const { container } = render(<Icon name="sun" />);

    expect(container.querySelector("svg")).toHaveClass(styles["size-inherit"] ?? "");
    expect(container.innerHTML).toBe(
      render(<Icon name="sun" weight="regular" />).container.innerHTML,
    );
  });

  it.each(Object.entries(weightMap))(
    "maps weight %s onto the family's %s glyphs (R6.5)",
    (ours, theirs) => {
      const Glyph = icons["sun"];
      const glyph = (markup: string) => markup.replace(/^<svg[^>]*>/, "");

      expect(
        glyph(renderToStaticMarkup(<Icon name="sun" weight={ours as keyof typeof weightMap} />)),
      ).toBe(glyph(renderToStaticMarkup(<Glyph weight={theirs} />)));
    },
  );

  it("draws different glyphs for different weights", () => {
    const light = renderToStaticMarkup(<Icon name="sun" weight="light" />);
    const bold = renderToStaticMarkup(<Icon name="sun" weight="bold" />);

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

  it("lets fill replace currentColor (refinement R1.5)", () => {
    const { container } = render(<Icon name="check" fill="red" />);

    expect(container.querySelector("svg")).toHaveAttribute("fill", "red");
  });

  it("passes stroke and viewBox to the svg (refinement R1.5)", () => {
    const { container } = render(<Icon name="check" stroke="blue" viewBox="0 0 128 128" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("stroke", "blue");
    expect(svg).toHaveAttribute("viewBox", "0 0 128 128");
  });

  it("renders children inside the svg, before the glyph (refinement R1.5)", () => {
    const { container } = render(
      <Icon name="check">
        <circle data-testid="extra" cx="128" cy="128" r="16" />
      </Icon>,
    );

    const svg = container.querySelector("svg");
    expect(svg?.firstElementChild).toBe(screen.getByTestId("extra"));
    expect(svg?.children.length).toBeGreaterThan(1);
  });

  it("keeps its accessibility attributes over rest props (refinement R1.5)", () => {
    const untyped: object = {
      "aria-hidden": false,
      "aria-label": "x",
      "aria-labelledby": "other",
      role: "presentation",
      tabIndex: 0,
    };
    const { container } = render(
      <>
        <Icon name="check" focusable="true" {...untyped} />
        <Icon name="github" label="GitHub" {...untyped} />
      </>,
    );

    const [decorative, labelled] = container.querySelectorAll("svg");
    expect(decorative).toHaveAttribute("aria-hidden", "true");
    expect(decorative).toHaveAttribute("focusable", "false");
    expect(screen.getByRole("img", { name: "GitHub" })).toBe(labelled);
    for (const svg of [decorative, labelled]) {
      expect(svg).not.toHaveAttribute("aria-labelledby");
      expect(svg).not.toHaveAttribute("tabindex");
    }
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<Icon name="mail" size="lg" label="Email" />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(<Icon name="moon" label="Dark" />);
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
