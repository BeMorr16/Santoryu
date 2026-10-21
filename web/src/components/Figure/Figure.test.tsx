import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import typographyStyles from "../Typography/Typography.module.css";
import { Figure } from "./Figure.tsx";
import styles from "./Figure.module.css";

const image = { src: "/owl.jpg", width: 1600, height: 1067 } as const;

describe("Figure", () => {
  it("is a figure holding an image named by its alt, lazy and async by default (refinement R18.1, R18.2, R18.4)", () => {
    const { container } = render(<Figure {...image} alt="A barn owl on a fence post" />);

    const figure = container.firstElementChild;
    expect(figure?.tagName).toBe("FIGURE");
    expect(figure).toHaveClass(styles.figure ?? "");
    const img = screen.getByRole("img", { name: "A barn owl on a fence post" });
    expect(figure?.firstElementChild).toBe(img);
    expect(img).toHaveClass(styles.image ?? "");
    expect(img).toHaveAttribute("src", "/owl.jpg");
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1067");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(container.querySelector("figcaption")).toBeNull();
  });

  // jsdom's name computation skips figcaption, so figure.spec.ts checks the figure's name in browsers.
  it("renders its caption after the image as small muted text with a measure (refinement R18.6)", () => {
    render(<Figure {...image} alt="A barn owl" caption="Taken at dusk" />);

    const figure = screen.getByRole("figure");
    const caption = figure.lastElementChild;
    expect(caption?.tagName).toBe("FIGCAPTION");
    expect(caption?.previousElementSibling?.tagName).toBe("IMG");
    expect(caption).toHaveClass(
      styles.caption ?? "",
      typographyStyles.small ?? "",
      typographyStyles["tone-muted"] ?? "",
      typographyStyles.measure ?? "",
    );
  });

  it.each([null, false])("renders no figcaption when caption is %s", (caption) => {
    const { container } = render(<Figure {...image} alt="A barn owl" caption={caption} />);

    expect(container.querySelector("figcaption")).toBeNull();
  });

  it('gives a decorative image alt="", so it has no img role, with or without a caption (refinement R18.2)', () => {
    const { container } = render(<Figure {...image} decorative caption="Taken at dusk" />);

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("figure")).toHaveTextContent("Taken at dusk");
    expect(container.firstElementChild).not.toHaveAttribute("role");
  });

  it("hides a decorative figure with no caption, and a passed role wins (refinement R18.2)", () => {
    const { container, rerender } = render(<Figure {...image} decorative />);

    expect(container.firstElementChild).toHaveAttribute("role", "none");
    expect(screen.queryByRole("figure")).toBeNull();

    rerender(<Figure {...image} decorative role="group" aria-label="Owl" />);
    expect(screen.getByRole("group", { name: "Owl" }).tagName).toBe("FIGURE");

    rerender(<Figure {...image} alt="A barn owl" />);
    expect(container.firstElementChild).not.toHaveAttribute("role");
  });

  it("passes every image attribute to the img, and overrides win over the defaults (refinement R18.1, R18.4)", () => {
    render(
      <Figure
        {...image}
        alt="A barn owl"
        srcSet="/owl-800.jpg 800w, /owl-1600.jpg 1600w"
        sizes="(max-width: 30em) 100vw, 40rem"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />,
    );

    const img = screen.getByRole("img", { name: "A barn owl" });
    expect(img).toHaveAttribute("srcset", "/owl-800.jpg 800w, /owl-1600.jpg 1600w");
    expect(img).toHaveAttribute("sizes", "(max-width: 30em) 100vw, 40rem");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("decoding", "sync");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("crossorigin", "anonymous");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("passes className, native props and ref to the figure (refinement R18.1)", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <Figure
        {...image}
        alt="A barn owl"
        ref={ref}
        id="owl"
        data-testid="owl"
        className="custom"
      />,
    );

    const figure = container.firstElementChild;
    expect(figure).toHaveAttribute("id", "owl");
    expect(figure).toHaveAttribute("data-testid", "owl");
    expect(figure).toHaveClass("custom", styles.figure ?? "");
    expect(ref.current).toBe(figure);
    expect(screen.getByRole("img")).not.toHaveAttribute("id");
  });

  it("sets the image's ratio on the figure for the height cap, keeping a passed style (refinement R18.5)", () => {
    const { container } = render(
      <Figure {...image} alt="A barn owl" style={{ outlineStyle: "dashed" }} />,
    );

    const figure = container.firstElementChild as HTMLElement;
    expect(figure.style.getPropertyValue("--_ratio")).toBe("1600 / 1067");
    expect(figure.style.outlineStyle).toBe("dashed");
  });

  it("puts nothing in the tab order", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <Figure {...image} alt="A barn owl" caption="Taken at dusk" />
        <button type="button">After</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <div>
        <Figure {...image} alt="A barn owl" caption="Taken at dusk" />
        <Figure {...image} decorative />
      </div>,
    );
  });

  it("has no axe violations informative with and without a caption, and decorative with one (R3.9)", async () => {
    const { container } = render(
      <div>
        <Figure {...image} alt="A barn owl on a fence post" caption="Taken at dusk" />
        <Figure {...image} alt="A barn owl on a fence post" />
        <Figure {...image} decorative caption="A barn owl on a fence post at dusk" />
        <Figure {...image} decorative />
      </div>,
    );

    await expectNoAxeViolations(container);
  });
});
