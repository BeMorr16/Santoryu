import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { Badge } from "./Badge.tsx";
import styles from "./Badge.module.css";

describe("Badge", () => {
  it("is non-interactive text in a span by default (R11.1, R11.3)", async () => {
    const user = userEvent.setup();
    render(<Badge>React</Badge>);

    const badge = screen.getByText("React");
    expect(badge.tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).toBeNull();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("defaults to the neutral variant at md size", () => {
    render(<Badge>React</Badge>);

    expect(screen.getByText("React")).toHaveClass(
      styles.badge ?? "",
      styles.neutral ?? "",
      styles.md ?? "",
    );
  });

  it.each(["neutral", "accent"] as const)("applies the %s variant (R11.2)", (variant) => {
    render(<Badge variant={variant}>React</Badge>);

    expect(screen.getByText("React")).toHaveClass(styles[variant] ?? "");
  });

  it.each(["sm", "md"] as const)("applies the %s size (R11.2)", (size) => {
    render(<Badge size={size}>React</Badge>);

    expect(screen.getByText("React")).toHaveClass(styles[size] ?? "");
  });

  it("renders as li inside a list (R11.1)", () => {
    render(
      <ul aria-label="Stack">
        <Badge as="li">React</Badge>
        <Badge as="li">TypeScript</Badge>
      </ul>,
    );

    expect(
      within(screen.getByRole("list", { name: "Stack" })).getAllByRole("listitem"),
    ).toHaveLength(2);
  });

  it("puts ref, rest props and className on the root (R3.2, R3.3)", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Badge ref={ref} id="b" title="Library" className="extra">
        React
      </Badge>,
    );

    const badge = screen.getByText("React");
    expect(ref.current).toBe(badge);
    expect(badge).toHaveAttribute("id", "b");
    expect(badge).toHaveAttribute("title", "Library");
    expect(badge).toHaveClass("extra", styles.badge ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(
      <Badge variant="accent" size="sm">
        New
      </Badge>,
    );

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(<Badge variant="accent">New</Badge>);
  });

  it("has no axe violations in every variant and size, inline and in a list (R3.9)", async () => {
    const { container } = render(
      <div>
        <p>
          <Badge>Neutral</Badge>{" "}
          <Badge variant="accent" size="sm">
            Accent
          </Badge>
        </p>
        <ul aria-label="Stack">
          <Badge as="li">React</Badge>
          <Badge as="li" variant="accent">
            AWS
          </Badge>
        </ul>
      </div>,
    );

    await expectNoAxeViolations(container);
  });
});
