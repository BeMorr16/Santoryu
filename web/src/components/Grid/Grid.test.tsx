import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Grid } from "./Grid.tsx";
import styles from "./Grid.module.css";

const cls = (name: string) => styles[name] ?? `missing:${name}`;

describe("Grid", () => {
  it("is a div with md columns and the md gap by default (R9.1)", () => {
    render(<Grid data-testid="grid" />);

    const grid = screen.getByTestId("grid");
    expect(grid.tagName).toBe("DIV");
    expect(grid).toHaveClass(cls("grid"), cls("min-md"), cls("gap-md"));
  });

  it.each(["sm", "md", "lg"] as const)(
    "sets the column minimum %s through its class (R9.1)",
    (min) => {
      render(<Grid data-testid="grid" min={min} />);

      expect(screen.getByTestId("grid")).toHaveClass(cls(`min-${min}`));
    },
  );

  it.each(["none", "xs", "sm", "md", "lg", "xl"] as const)(
    "sets gap %s through its class",
    (gap) => {
      render(<Grid data-testid="grid" gap={gap} />);

      expect(screen.getByTestId("grid")).toHaveClass(cls(`gap-${gap}`));
    },
  );

  it.each(["ul", "ol"] as const)("keeps list semantics as %s, without markers (R9.3)", (as) => {
    render(
      <Grid as={as}>
        <li>One</li>
        <li>Two</li>
      </Grid>,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe(as.toUpperCase());
    expect(list).toHaveClass(cls("list"));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders as section (R9.3)", () => {
    render(<Grid as="section" aria-label="Projects" />);

    expect(screen.getByRole("region", { name: "Projects" }).tagName).toBe("SECTION");
  });

  it("puts ref, rest props and className on the root (R3.2, R3.3)", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Grid ref={ref} data-testid="grid" id="g" className="extra" />);

    const root = screen.getByTestId("grid");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "g");
    expect(root).toHaveClass("extra", cls("grid"));
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(<Grid min="lg" gap="xs" />);

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Grid as="ul" min="sm">
        <li>One</li>
      </Grid>,
    );
  });

  it("has no axe violations (R3.9)", async () => {
    const { container } = render(
      <Grid as="ul">
        <li>One</li>
        <li>Two</li>
      </Grid>,
    );

    await expectNoAxeViolations(container);
  });
});
