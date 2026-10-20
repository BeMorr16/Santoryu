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

  it.each(["neutral", "accent", "accent-2", "success", "warning", "error"] as const)(
    "applies the %s variant (R11.2, refinement R9.6)",
    (variant) => {
      render(<Badge variant={variant}>React</Badge>);

      expect(screen.getByText("React")).toHaveClass(styles[variant] ?? "");
    },
  );

  it("renders a decorative icon before the text when icon is set (refinement R9.9)", () => {
    render(
      <h2>
        <Badge variant="success" icon="check">
          Live
        </Badge>
      </h2>,
    );

    expect(screen.getByRole("heading", { name: "Live" })).toBeInTheDocument();
    const badge = screen.getByText("Live");
    const icon = badge.firstElementChild;
    expect(icon?.tagName.toLowerCase()).toBe("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass(styles.icon ?? "");
    expect(badge.lastChild).toHaveProperty("nodeValue", "Live");
    expect(badge.textContent).toBe("Live");
  });

  it("renders no icon without icon (refinement R9.9)", () => {
    render(<Badge variant="success">Live</Badge>);

    expect(screen.getByText("Live").querySelector("svg")).toBeNull();
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

  it("has no axe violations in every variant and size, with an icon, inline and in a list (R3.9)", async () => {
    const { container } = render(
      <div>
        <p>
          <Badge>Neutral</Badge>{" "}
          <Badge variant="accent" size="sm">
            Accent
          </Badge>{" "}
          <Badge variant="accent-2">Accent 2</Badge> <Badge variant="success">Live</Badge>{" "}
          <Badge variant="warning">Beta</Badge> <Badge variant="error">Deprecated</Badge>{" "}
          <Badge variant="success" icon="check">
            Live
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
