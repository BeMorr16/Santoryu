import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SubmitEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import styles from "../shared/button-styles.module.css";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import { Button, type ButtonProps } from "./Button.tsx";

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
      <Button iconStart="sun" iconEnd="arrow-right">
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

  describe("icon-only is square (refinement R3.5)", () => {
    it.each([
      ["an icon and no children", <Button key="a" iconStart="check" aria-label="Done" />],
      [
        "an icon and only VisuallyHidden",
        <Button key="b" iconEnd="check">
          <VisuallyHidden>Done</VisuallyHidden>
        </Button>,
      ],
      [
        "an icon and an empty child",
        <Button key="c" iconStart="check" aria-label="Done">
          {false}
        </Button>,
      ],
    ])("with %s", (_, button) => {
      render(button);

      expect(screen.getByRole("button", { name: "Done" })).toHaveClass(styles.iconOnly ?? "");
    });

    it.each([
      ["two icons", <Button key="d" iconStart="check" iconEnd="arrow-right" aria-label="Done" />],
      [
        "text",
        <Button key="a" iconStart="check">
          Done
        </Button>,
      ],
      [
        "text plus VisuallyHidden",
        <Button key="b" iconStart="check">
          Done <VisuallyHidden>today</VisuallyHidden>
        </Button>,
      ],
      [
        "VisuallyHidden and no icon",
        <Button key="c">
          <VisuallyHidden>Done</VisuallyHidden>
        </Button>,
      ],
    ])("but not with %s", (_, button) => {
      render(button);

      expect(screen.getByRole("button")).not.toHaveClass(styles.iconOnly ?? "");
    });
  });

  it("passes aria-pressed through, making a toggle button (refinement R3.1)", () => {
    render(<Button aria-pressed>Show grid</Button>);

    expect(screen.getByRole("button", { name: "Show grid", pressed: true })).toBeInTheDocument();
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

    it("clears a cast-in aria-disabled (refinement R3.7)", () => {
      const props = { "aria-disabled": true, children: "Save" } as ButtonProps;
      render(<Button {...props} />);

      expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-disabled");
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

  it("has no axe violations: every variant enabled and disabled, toggles and icon-only (R3.9, refinement R3.11)", async () => {
    const { container } = render(
      <div>
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            Save
          </Button>
        ))}
        {variants.map((variant) => (
          <Button key={variant} variant={variant} disabled>
            Save
          </Button>
        ))}
        <Button variant="secondary" aria-pressed>
          Show grid
        </Button>
        <Button variant="ghost" aria-pressed>
          Wrap lines
        </Button>
        <Button variant="primary" aria-pressed>
          Notify me
        </Button>
        <Button variant="primary" size="sm" iconStart="github" aria-label="GitHub" />
        <Button variant="ghost" iconStart="chevron-down">
          <VisuallyHidden>Show more</VisuallyHidden>
        </Button>
      </div>,
    );

    await expectNoAxeViolations(container);
  });
});

describe("Button: tooltips (refinement R14.11, R14.12)", () => {
  const popupAfter = (button: HTMLElement) => {
    const popup = button.nextElementSibling;
    return popup instanceof HTMLElement && popup.hasAttribute("popover") ? popup : null;
  };

  it("describes a disabled button by its reason, and adds nothing while enabled", () => {
    const { rerender } = render(
      <Button disabled disabledReason="Add a title first">
        Publish
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Publish" });
    expect(button).toHaveAccessibleDescription("Add a title first");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Add a title first");

    rerender(<Button disabledReason="Add a title first">Publish</Button>);
    expect(button).toHaveAccessibleDescription("");
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(popupAfter(button)).toBeNull();
  });

  it("shows the reason on a press, and hides it on a press outside", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button disabled disabledReason="Add a title first" onClick={onClick}>
          Publish
        </Button>
        <p>Outside</p>
      </>,
    );
    const button = screen.getByRole("button", { name: "Publish" });

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("tooltip")).toBeVisible();
    await user.unhover(button);
    expect(screen.getByRole("tooltip")).toBeVisible();

    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByRole("tooltip", { hidden: true })).not.toBeVisible();
  });

  it("shows the reason on a tap", async () => {
    const user = userEvent.setup();
    render(
      <Button disabled disabledReason="Add a title first">
        Publish
      </Button>,
    );

    await user.pointer({
      keys: "[TouchA]",
      target: screen.getByRole("button", { name: "Publish" }),
    });
    expect(screen.getByRole("tooltip")).toBeVisible();
  });

  it("keeps focus on the button when it becomes disabled with a reason", () => {
    const { rerender } = render(<Button disabledReason="Add a title first">Publish</Button>);
    const button = screen.getByRole("button", { name: "Publish" });
    button.focus();

    rerender(
      <Button disabled disabledReason="Add a title first">
        Publish
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBe(button);
    expect(button).toHaveFocus();
  });

  it("shows an icon-only button's name from aria-label or VisuallyHidden children", () => {
    render(
      <>
        <Button iconStart="check" aria-label="Mark as done" />
        <Button iconStart="arrow-right">
          <VisuallyHidden>Next</VisuallyHidden>
        </Button>
      </>,
    );

    for (const name of ["Mark as done", "Next"]) {
      const button = screen.getByRole("button", { name });
      const popup = popupAfter(button);
      expect(popup).toHaveTextContent(name);
      expect(popup).toHaveAttribute("aria-hidden", "true");
      expect(button).not.toHaveAttribute("aria-describedby");
    }
  });

  it("shows no name for a labelled button, aria-labelledby, or nameTooltip={false}", () => {
    render(
      <>
        <span id="external">Close panel</span>
        <Button iconStart="check">Done</Button>
        <Button iconStart="arrow-right" aria-labelledby="external" />
        <Button iconStart="check" aria-label="Mark as done" nameTooltip={false} />
      </>,
    );

    expect(popupAfter(screen.getByRole("button", { name: "Done" }))).toBeNull();
    expect(popupAfter(screen.getByRole("button", { name: "Close panel" }))).toBeNull();
    expect(popupAfter(screen.getByRole("button", { name: "Mark as done" }))).toBeNull();
  });

  it("uses one popup for an icon-only name and its reason, describing only the reason", () => {
    render(
      <Button
        iconStart="check"
        aria-label="Mark as done"
        disabled
        disabledReason="Nothing to mark"
      />,
    );

    const button = screen.getByRole("button", { name: "Mark as done" });
    const popup = popupAfter(button);
    expect(popup).toHaveAttribute("role", "tooltip");
    expect(popup?.textContent).toBe("Mark as doneNothing to mark");
    expect(button).toHaveAccessibleDescription("Nothing to mark");
    expect(document.querySelectorAll("[popover]")).toHaveLength(1);
  });

  it("has no axe violations with a reason shown", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Button
        iconStart="check"
        aria-label="Mark as done"
        disabled
        disabledReason="Nothing to mark"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mark as done" }));
    await expectNoAxeViolations(container);
  });
});
