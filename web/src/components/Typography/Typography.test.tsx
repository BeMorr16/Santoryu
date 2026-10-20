import { render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import {
  Typography,
  type TypographyElement,
  type TypographyTone,
  type TypographyVariant,
} from "./Typography.tsx";
import styles from "./Typography.module.css";

// Every element in the `as` union, with the variant it derives (refinement R12.3).
const derived = [
  ["p", "body"],
  ["span", "inherit"],
  ["div", "body"],
  ["h1", "h1"],
  ["h2", "h2"],
  ["h3", "h3"],
  ["h4", "h4"],
  ["h5", "h5"],
  ["h6", "h6"],
  ["label", "body"],
  ["legend", "body"],
  ["strong", "inherit"],
  ["em", "inherit"],
  ["small", "small"],
  ["mark", "inherit"],
  ["s", "inherit"],
  ["code", "code"],
  ["kbd", "code"],
  ["samp", "code"],
  ["abbr", "inherit"],
  ["cite", "inherit"],
  ["q", "inherit"],
  ["time", "inherit"],
  ["blockquote", "body"],
  ["figcaption", "body"],
  ["caption", "body"],
  ["li", "body"],
  ["dt", "body"],
  ["dd", "body"],
] as const satisfies readonly (readonly [TypographyElement, TypographyVariant])[];

const variants = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "lead",
  "body",
  "small",
  "label",
  "code",
  "inherit",
] as const satisfies readonly TypographyVariant[];

const tones = [
  "default",
  "muted",
  "subtle",
  "accent",
  "accent-2",
  "success",
  "warning",
  "error",
] as const satisfies readonly TypographyTone[];

const headingLooks = ["display", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
const runningLooks = ["lead", "body", "small", "label"] as const;

const parents: Partial<Record<TypographyElement, (child: ReactNode) => ReactNode>> = {
  li: (child) => <ul>{child}</ul>,
  dt: (child) => <dl>{child}</dl>,
  dd: (child) => <dl>{child}</dl>,
  figcaption: (child) => <figure>{child}</figure>,
  caption: (child) => <table>{child}</table>,
  legend: (child) => <fieldset>{child}</fieldset>,
};

/** Classes that set a look: every variant class except the shared ones. */
const variantClasses = variants.flatMap((v) => (v === "inherit" ? [] : [styles[v] ?? ""]));

describe("Typography", () => {
  it("renders a p with the body look by default (refinement R12.1, R12.3)", () => {
    render(<Typography>Text</Typography>);

    const text = screen.getByText("Text");
    expect(text.tagName).toBe("P");
    expect(text).toHaveClass(styles.typography ?? "", styles.body ?? "", styles.running ?? "");
  });

  it("tests every element, variant and tone in the unions", () => {
    expectTypeOf<(typeof derived)[number][0]>().toEqualTypeOf<TypographyElement>();
    expectTypeOf<(typeof variants)[number]>().toEqualTypeOf<TypographyVariant>();
    expectTypeOf<(typeof tones)[number]>().toEqualTypeOf<TypographyTone>();
  });

  it.each(derived)(
    "renders <%s> with the %s look when variant is unset (refinement R12.3)",
    (element, look) => {
      const text = <Typography as={element}>Text</Typography>;
      render(<>{parents[element]?.(text) ?? text}</>);

      const root = screen.getByText("Text");
      expect(root.tagName).toBe(element.toUpperCase());
      const applied = variantClasses.filter((c) => root.classList.contains(c));
      expect(applied).toEqual(look === "inherit" ? [] : [styles[look]]);
    },
  );

  it("lets an explicit variant win over the element's, keeping the element (refinement R12.2)", () => {
    render(
      <Typography as="h2" variant="h4">
        Section
      </Typography>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Section" });
    expect(heading).toHaveClass(styles.h4 ?? "");
    expect(heading).not.toHaveClass(styles.h2 ?? "");
  });

  it('gives an explicit variant="inherit" no look class', () => {
    render(<Typography variant="inherit">Text</Typography>);

    const text = screen.getByText("Text");
    expect(variantClasses.filter((c) => text.classList.contains(c))).toEqual([]);
    expect(text).toHaveClass(styles.typography ?? "");
  });

  it.each(headingLooks)("gives the %s look the heading class only (refinement R12.4)", (look) => {
    render(<Typography variant={look}>Text</Typography>);

    const text = screen.getByText("Text");
    expect(text).toHaveClass(styles.heading ?? "");
    expect(text).not.toHaveClass(styles.running ?? "");
    // A heading look never makes a heading: the level comes only from `as` (refinement R12.2).
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it.each(runningLooks)("gives the %s look the running class only (refinement R12.4)", (look) => {
    render(<Typography variant={look}>Text</Typography>);

    const text = screen.getByText("Text");
    expect(text).toHaveClass(styles.running ?? "");
    expect(text).not.toHaveClass(styles.heading ?? "");
  });

  it.each(["code", "inherit"] as const)("gives the %s look neither class", (look) => {
    render(<Typography variant={look}>Text</Typography>);

    const text = screen.getByText("Text");
    expect(text).not.toHaveClass(styles.heading ?? "");
    expect(text).not.toHaveClass(styles.running ?? "");
  });

  it.each(tones)("adds the %s tone's class (refinement R12.5)", (tone) => {
    render(<Typography tone={tone}>Text</Typography>);

    expect(screen.getByText("Text")).toHaveClass(styles[`tone-${tone}`] ?? "");
  });

  it("adds no tone class without tone, so the color is inherited (refinement R12.5)", () => {
    render(<Typography>Text</Typography>);

    const text = screen.getByText("Text");
    for (const tone of tones) expect(text).not.toHaveClass(styles[`tone-${tone}`] ?? "");
  });

  it("adds the measure class only with measure (refinement R12.6)", () => {
    render(
      <>
        <Typography measure>Capped</Typography>
        <Typography>Uncapped</Typography>
        <Typography measure={false}>Off</Typography>
      </>,
    );

    expect(screen.getByText("Capped")).toHaveClass(styles.measure ?? "");
    expect(screen.getByText("Uncapped")).not.toHaveClass(styles.measure ?? "");
    expect(screen.getByText("Off")).not.toHaveClass(styles.measure ?? "");
  });

  it("puts ref, native props and className on the element (R3.2, R3.3)", () => {
    const ref = createRef<HTMLTimeElement>();
    render(
      <Typography ref={ref} as="time" dateTime="2026-10-20" id="t" className="extra">
        20 October
      </Typography>,
    );

    const time = screen.getByText("20 October");
    expect(ref.current).toBe(time);
    expect(time).toHaveAttribute("datetime", "2026-10-20");
    expect(time).toHaveAttribute("id", "t");
    expect(time).toHaveClass("extra", styles.typography ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(
      <Typography variant="lead" tone="muted" measure>
        Lead
      </Typography>,
    );

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Typography as="h1" variant="display">
        Name
      </Typography>,
    );
  });

  it("has no axe violations on a heading, a toned paragraph and inline elements (R3.9)", async () => {
    const { container } = render(
      <main>
        <Typography as="h1" variant="display">
          Name
        </Typography>
        <Typography as="h2" variant="h4">
          Section
        </Typography>
        <Typography variant="lead" tone="muted" measure>
          A lead paragraph.
        </Typography>
        <Typography tone="error">Error: the email is missing</Typography>
        <Typography>
          Press <Typography as="kbd">Tab</Typography> to reach{" "}
          <Typography as="code">main</Typography>.{" "}
          <Typography as="abbr" title="Web Content Accessibility Guidelines">
            WCAG
          </Typography>{" "}
          was published on{" "}
          <Typography as="time" dateTime="2023-10-05">
            5 October 2023
          </Typography>
          . <Typography as="q">Quoted</Typography>
        </Typography>
      </main>,
    );

    await expectNoAxeViolations(container);
  });
});
