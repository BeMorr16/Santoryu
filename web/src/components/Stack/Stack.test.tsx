import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import layout from "../shared/layout.module.css";
import { Stack } from "./Stack.tsx";
import styles from "./Stack.module.css";

const cls = (name: string) => styles[name] ?? `missing:${name}`;
const shared = (name: string) => layout[name] ?? `missing:${name}`;

describe("Stack", () => {
  it("is a vertical div with the md gap by default (R8.1, R8.2)", () => {
    render(<Stack data-testid="stack">x</Stack>);

    const stack = screen.getByTestId("stack");
    expect(stack.tagName).toBe("DIV");
    expect(stack).toHaveClass(
      cls("stack"),
      cls("vertical"),
      shared("row-gap-md"),
      shared("column-gap-md"),
    );
  });

  it.each(["vertical", "horizontal"] as const)("applies direction %s (R8.1)", (direction) => {
    render(<Stack data-testid="stack" direction={direction} />);

    expect(screen.getByTestId("stack")).toHaveClass(cls(direction));
  });

  it.each(["none", "xs", "sm", "md", "lg", "xl"] as const)(
    "applies gap %s to both the row and the column gap (R8.1, refinement R6.2)",
    (gap) => {
      render(<Stack data-testid="stack" direction="horizontal" gap={gap} />);

      expect(screen.getByTestId("stack")).toHaveClass(
        shared(`row-gap-${gap}`),
        shared(`column-gap-${gap}`),
      );
    },
  );

  it.each(["none", "xs", "sm", "md", "lg", "xl"] as const)(
    "lets rowGap and columnGap %s override gap on their own axis only (refinement R6.2)",
    (step) => {
      render(
        <>
          <Stack data-testid="row" gap="lg" rowGap={step} />
          <Stack data-testid="column" gap="lg" columnGap={step} />
        </>,
      );

      const row = screen.getByTestId("row");
      expect(row).toHaveClass(shared(`row-gap-${step}`), shared("column-gap-lg"));
      if (step !== "lg") expect(row).not.toHaveClass(shared("row-gap-lg"));
      const column = screen.getByTestId("column");
      expect(column).toHaveClass(shared("row-gap-lg"), shared(`column-gap-${step}`));
      if (step !== "lg") expect(column).not.toHaveClass(shared("column-gap-lg"));
    },
  );

  it.each(["start", "center", "end", "stretch", "baseline"] as const)(
    "applies align %s",
    (align) => {
      render(<Stack data-testid="stack" align={align} />);

      expect(screen.getByTestId("stack")).toHaveClass(cls(`align-${align}`));
    },
  );

  it.each(["start", "center", "end", "between"] as const)("applies justify %s", (justify) => {
    render(<Stack data-testid="stack" justify={justify} />);

    expect(screen.getByTestId("stack")).toHaveClass(cls(`justify-${justify}`));
  });

  it("wraps horizontal Stacks by default, and wrap={false} opts out (refinement R6.1)", () => {
    render(
      <>
        <Stack data-testid="default" direction="horizontal" />
        <Stack data-testid="one-line" direction="horizontal" wrap={false} />
      </>,
    );

    expect(screen.getByTestId("default")).toHaveClass(cls("wrap"));
    expect(screen.getByTestId("one-line")).not.toHaveClass(cls("wrap"));
  });

  it("wraps a vertical Stack only when asked (refinement R6.1)", () => {
    render(
      <>
        <Stack data-testid="wrapped" wrap />
        <Stack data-testid="plain" />
      </>,
    );

    expect(screen.getByTestId("wrapped")).toHaveClass(cls("wrap"));
    expect(screen.getByTestId("plain")).not.toHaveClass(cls("wrap"));
  });

  it.each(["section", "nav", "header", "footer", "form"] as const)("renders as %s (R8.2)", (as) => {
    render(<Stack as={as} data-testid="stack" aria-label="Region" />);

    expect(screen.getByTestId("stack").tagName).toBe(as.toUpperCase());
  });

  it.each(["ul", "ol"] as const)("keeps list semantics as %s, without markers (R8.2)", (as) => {
    render(
      <Stack as={as} direction="horizontal">
        <li>One</li>
        <li>Two</li>
      </Stack>,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe(as.toUpperCase());
    expect(list).toHaveClass(shared("list"));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("resets a fieldset with the shared class, and the legend names its group (R8.2, refinement R6.4)", () => {
    render(
      <Stack as="fieldset" gap="sm">
        <legend>Contact preference</legend>
        <label>
          <input type="radio" name="contact" defaultChecked /> Email
        </label>
      </Stack>,
    );

    expect(screen.getByRole("group", { name: "Contact preference" })).toHaveClass(
      shared("fieldset"),
      shared("row-gap-sm"),
    );
  });

  it("keeps a consumer role", () => {
    render(<Stack as="ul" role="menu" aria-label="Actions" />);

    expect(screen.getByRole("menu", { name: "Actions" })).toBeInTheDocument();
  });

  it("puts ref, rest props and className on the root (R3.2, R3.3)", () => {
    const ref = createRef<HTMLElement>();
    render(<Stack as="section" ref={ref} aria-label="Intro" id="intro" className="extra" />);

    const root = screen.getByRole("region", { name: "Intro" });
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "intro");
    expect(root).toHaveClass("extra", cls("stack"));
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<Stack direction="horizontal" gap="xl" align="center" wrap />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Stack as="ul" direction="horizontal" gap="sm">
        <li>One</li>
      </Stack>,
    );
  });

  it("has no axe violations as a div and as a list (R3.9)", async () => {
    const { container } = render(
      <Stack>
        <p>Text</p>
        <Stack as="ul" direction="horizontal" wrap>
          <li>One</li>
          <li>Two</li>
        </Stack>
      </Stack>,
    );

    await expectNoAxeViolations(container);
  });
});
