import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SubmitEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import styles from "../shared/button-styles.module.css";
import { Button } from "./Button.tsx";

const variants = ["primary", "secondary", "ghost"] as const;
const sizes = ["sm", "md"] as const;

describe("Button", () => {
  it('is a native button with type="button" by default (R4.1)', () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("keeps a consumer type (R4.1)", () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("defaults to the secondary variant at md size (R4.2)", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button")).toHaveClass(
      styles.button ?? "",
      styles.secondary ?? "",
      styles.md ?? "",
    );
  });

  it.each(variants.flatMap((variant) => sizes.map((size) => [variant, size] as const)))(
    "applies the %s variant and %s size classes (R4.2)",
    (variant, size) => {
      render(
        <Button variant={variant} size={size}>
          Save
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass(styles[variant] ?? "", styles[size] ?? "");
      for (const other of variants.filter((v) => v !== variant)) {
        expect(button).not.toHaveClass(styles[other] ?? "");
      }
    },
  );

  it("renders start and end icons as decorative, in order, around the label (R4.3)", () => {
    render(
      <Button iconStart="theme-light" iconEnd="arrow-right">
        Next
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Next" });
    const icons = button.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    for (const icon of icons) expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(button.firstElementChild).toBe(icons[0]);
    expect(button.lastElementChild).toBe(icons[1]);
  });

  it("names an icon-only button by aria-label (R4.4)", () => {
    render(<Button iconStart="github" aria-label="GitHub" />);

    expect(screen.getByRole("button", { name: "GitHub" })).toBeInTheDocument();
  });

  it.each(["{Enter}", " "])("runs onClick once on %j (R4.6)", async (key) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    await user.keyboard(key);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("runs onClick once on click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe("disabled (R4.5, decision 0007 G)", () => {
    it("is announced as disabled through aria-disabled, never the native attribute", () => {
      render(<Button disabled>Save</Button>);

      const button = screen.getByRole("button", { name: "Save" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toHaveAttribute("disabled");
    });

    it("omits aria-disabled when enabled", () => {
      render(<Button>Save</Button>);

      expect(screen.getByRole("button")).not.toHaveAttribute("aria-disabled");
    });

    it("stays in the tab order", async () => {
      const user = userEvent.setup();
      render(<Button disabled>Save</Button>);

      await user.tab();

      expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    });

    it("never calls onClick on click, Enter or Space", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Save
        </Button>,
      );

      await user.click(screen.getByRole("button"));
      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(onClick).not.toHaveBeenCalled();
    });

    it("doesn't submit its form by click or by Enter in a field", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
      });
      render(
        <form aria-label="Contact" onSubmit={onSubmit}>
          <label>
            Name <input name="name" />
          </label>
          <Button type="submit" disabled>
            Send
          </Button>
        </form>,
      );

      await user.click(screen.getByRole("button", { name: "Send" }));
      await user.type(screen.getByRole("textbox", { name: "Name" }), "Ben{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits normally once enabled (control for the test above)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
      });
      render(
        <form aria-label="Contact" onSubmit={onSubmit}>
          <label>
            Name <input name="name" />
          </label>
          <Button type="submit">Send</Button>
        </form>,
      );

      await user.type(screen.getByRole("textbox", { name: "Name" }), "Ben{Enter}");
      await user.click(screen.getByRole("button", { name: "Send" }));

      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });

  it("puts ref, rest props and className on the button, keeping its own classes (R3.2, R3.3)", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        id="save"
        data-kind="primary-action"
        aria-describedby="hint"
        className="extra"
      >
        Save
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("id", "save");
    expect(button).toHaveAttribute("data-kind", "primary-action");
    expect(button).toHaveAttribute("aria-describedby", "hint");
    expect(button).toHaveClass("extra", styles.button ?? "");
  });

  it("renders no style attribute (R3.5)", () => {
    const { container } = render(
      <Button variant="primary" iconStart="check" disabled>
        Save
      </Button>,
    );

    expect(container.querySelector("[style]")).toBeNull();
  });

  it("hydrates prerendered markup with no mismatch (R3.6)", () => {
    expectHydratesCleanly(
      <Button variant="primary" iconEnd="arrow-right">
        Next
      </Button>,
    );
  });

  it.each(variants)(
    "has no axe violations as %s, enabled, disabled and icon-only (R3.9)",
    async (variant) => {
      const { container } = render(
        <div>
          <Button variant={variant}>Save</Button>
          <Button variant={variant} disabled>
            Save
          </Button>
          <Button variant={variant} size="sm" iconStart="github" aria-label="GitHub" />
        </div>,
      );

      await expectNoAxeViolations(container);
    },
  );
});
