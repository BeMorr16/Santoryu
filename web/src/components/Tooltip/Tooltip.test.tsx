import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { Button } from "../Button/Button.tsx";
import { Tooltip, type TooltipProps } from "./Tooltip.tsx";
import styles from "./Tooltip.module.css";

// Each test's clock starts well after the last one's, so no test starts warm (refinement R14.5).
// Testing Library flushes each user-event step with a setTimeout(0), which it only advances on a
// fake clock when it finds `jest`; this gives it Vitest's.
let clock = Date.UTC(2030, 0, 1);
beforeEach(() => {
  clock += 1_000_000;
  vi.useFakeTimers({ now: clock, toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  // jsdom guesses :focus-visible from earlier events, carried across tests, and misses Tab moves
  // between triggers. This follows browsers instead: focus is visible unless a pointer was pressed
  // since the last key.
  let fromKeyboard = true;
  const onKey = () => (fromKeyboard = true);
  const onPointer = () => (fromKeyboard = false);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("pointerdown", onPointer, true);
  onTestFinished(() => {
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerdown", onPointer, true);
  });
  // Shadows Element's own matches, which still does the matching.
  vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function (
    this: HTMLElement,
    selector: string,
  ) {
    if (selector !== ":focus-visible") return Element.prototype.matches.call(this, selector);
    return fromKeyboard && Element.prototype.matches.call(this, ":focus");
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const setup = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });

function popupOf(trigger: HTMLElement): HTMLElement {
  const popup = trigger.nextElementSibling;
  if (!(popup instanceof HTMLElement) || !popup.hasAttribute("popover")) {
    throw new Error("No popup after this trigger");
  }
  return popup;
}

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

function Fixture(props: Partial<TooltipProps> & { children?: TooltipProps["children"] }) {
  return (
    <>
      <button type="button">Before</button>
      <Tooltip content="Saves without publishing" {...props}>
        {props.children ?? <button type="button">Save draft</button>}
      </Tooltip>
    </>
  );
}

describe("Tooltip: markup (refinement R14.1–R14.3)", () => {
  it("renders the popup right after the trigger, a closed manual popover", () => {
    render(<Fixture />);

    const trigger = screen.getByRole("button", { name: "Save draft" });
    const popup = popupOf(trigger);
    expect(popup.tagName).toBe("SPAN");
    expect(popup).toHaveAttribute("popover", "manual");
    expect(popup).toHaveAttribute("data-side", "top");
    expect(popup).toHaveClass(styles.tooltip ?? "");
    expect(popup).not.toBeVisible();
    expect(trigger.parentElement).toBe(popup.parentElement);
  });

  it("describes the trigger, after any description it already had", () => {
    render(
      <>
        <span id="hint">Ctrl+S</span>
        <Tooltip content="Saves without publishing">
          <button type="button" aria-describedby="hint">
            Save draft
          </button>
        </Tooltip>
      </>,
    );

    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(trigger).toHaveAccessibleDescription("Ctrl+S Saves without publishing");
    expect(trigger.getAttribute("aria-describedby")?.split(" ")[0]).toBe("hint");
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toBe(popupOf(trigger));
  });

  it("has its text in the prerendered markup", () => {
    const html = renderToString(<Fixture />);
    expect(html).toContain("Saves without publishing");
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("aria-describedby");
  });

  it('kind="name" is hidden from assistive technology and not linked', () => {
    render(
      <Tooltip content="Mark as done" kind="name">
        <button type="button" aria-label="Mark as done">
          ✓
        </button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Mark as done" });
    const popup = popupOf(trigger);
    expect(popup).toHaveAttribute("aria-hidden", "true");
    expect(popup).not.toHaveAttribute("role");
    expect(trigger).not.toHaveAttribute("aria-describedby");
    expect(trigger).toHaveAccessibleDescription("");
  });

  it("passes native props to the popup", () => {
    render(<Fixture className="custom" lang="en" />);
    const popup = screen.getByRole("tooltip", { hidden: true });
    expect(popup).toHaveAttribute("lang", "en");
    expect(popup).toHaveClass("custom");
    expect(popup).toHaveClass(styles.tooltip ?? "");
  });

  it("keeps the trigger's own ref and handlers, which run first", async () => {
    const user = setup();
    const ref = createRef<HTMLButtonElement>();
    const calls: string[] = [];
    render(
      <Tooltip content="Saves without publishing">
        <button
          type="button"
          ref={ref}
          onFocus={() => calls.push("focus")}
          onPointerEnter={() => calls.push("enter")}
          onClick={() => calls.push("click")}
        >
          Save draft
        </button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(ref.current).toBe(trigger);
    await user.hover(trigger);
    await user.click(trigger);
    await user.tab();
    await user.tab({ shift: true });
    expect(calls).toEqual(["enter", "focus", "click", "focus"]);
  });

  it("keeps the same trigger node when the popup comes and goes", () => {
    function Toggle({ content }: { content: ReactNode }) {
      return (
        <Tooltip content={content}>
          <button type="button">Save draft</button>
        </Tooltip>
      );
    }
    const { rerender } = render(<Toggle content={null} />);
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(trigger.nextElementSibling).toBeNull();
    trigger.focus();

    rerender(<Toggle content="Saves without publishing" />);
    expect(screen.getByRole("button", { name: "Save draft" })).toBe(trigger);
    expect(popupOf(trigger)).toBeInTheDocument();
    expect(trigger).toHaveFocus();

    rerender(<Toggle content={null} />);
    expect(screen.getByRole("button", { name: "Save draft" })).toBe(trigger);
    expect(trigger.nextElementSibling).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("Tooltip: showing (refinement R14.5)", () => {
  it("shows on mouse hover after 300ms, not before", async () => {
    const user = setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Save draft" });

    await user.hover(trigger);
    advance(299);
    expect(popupOf(trigger)).not.toBeVisible();
    advance(1);
    expect(popupOf(trigger)).toBeVisible();
  });

  it("never shows from a touch pointer", async () => {
    const user = setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Save draft" });

    await user.pointer({ keys: "[TouchA]", target: trigger });
    advance(1000);
    expect(popupOf(trigger)).not.toBeVisible();
  });

  it("shows at once on keyboard focus", async () => {
    const user = setup();
    render(<Fixture />);

    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(trigger).toHaveFocus();
    expect(popupOf(trigger)).toBeVisible();
  });

  it("shows at once within 300ms of another tooltip hiding", async () => {
    const user = setup();
    render(
      <>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
      </>,
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });

    await user.hover(one);
    advance(300);
    await user.unhover(one);
    advance(150);
    expect(popupOf(one)).not.toBeVisible();
    advance(100);
    await user.hover(two);
    expect(popupOf(two)).toBeVisible();
  });

  it("doesn't skip the hover delay for a tooltip shown by focus or `open`", async () => {
    const user = setup();
    render(
      <>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
        <Tooltip content="Pinned tip" open>
          <button type="button">Pinned</button>
        </Tooltip>
      </>,
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });

    await user.tab();
    expect(popupOf(one)).toBeVisible();
    await user.hover(two);
    expect(popupOf(two)).not.toBeVisible();
    advance(300);
    expect(popupOf(two)).toBeVisible();
  });

  it("waits again once the row has cooled down", async () => {
    const user = setup();
    render(
      <>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
      </>,
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });

    await user.hover(one);
    advance(300);
    await user.unhover(one);
    advance(150);
    expect(popupOf(one)).not.toBeVisible();
    advance(300);
    await user.hover(two);
    expect(popupOf(two)).not.toBeVisible();
    advance(300);
    expect(popupOf(two)).toBeVisible();
  });

  it("shows one tooltip at a time", async () => {
    const user = setup();
    render(
      <>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
      </>,
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });

    await user.tab();
    expect(popupOf(one)).toBeVisible();
    await user.tab();
    expect(popupOf(two)).toBeVisible();
    expect(popupOf(one)).not.toBeVisible();
  });

  it('never shows while the trigger has aria-expanded="true"', async () => {
    const user = setup();
    render(
      <Fixture>
        <button type="button" aria-expanded="true">
          Save draft
        </button>
      </Fixture>,
    );
    const trigger = screen.getByRole("button", { name: "Save draft" });

    await user.tab();
    await user.tab();
    await user.hover(trigger);
    advance(1000);
    expect(popupOf(trigger)).not.toBeVisible();
  });
});

describe("Tooltip: hiding (refinement R14.6)", () => {
  it("hides 150ms after the pointer leaves, and stays while it moves onto the popup", async () => {
    const user = setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Save draft" });
    const popup = popupOf(trigger);

    await user.hover(trigger);
    advance(300);
    await user.unhover(trigger);
    advance(100);
    await user.hover(popup);
    advance(1000);
    expect(popup).toBeVisible();

    await user.unhover(popup);
    advance(149);
    expect(popup).toBeVisible();
    advance(1);
    expect(popup).not.toBeVisible();
  });

  it("stays shown by keyboard focus while the mouse passes over and off the trigger (WCAG 1.4.13)", async () => {
    const user = setup();
    render(<Fixture />);

    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(popupOf(trigger)).toBeVisible();
    await user.hover(trigger);
    await user.unhover(trigger);
    advance(300);
    expect(popupOf(trigger)).toBeVisible();
  });

  it("never hides on a timer", async () => {
    const user = setup();
    render(<Fixture />);
    await user.tab();
    await user.tab();
    advance(60_000);
    expect(screen.getByRole("tooltip")).toBeVisible();
  });

  it("hides on Escape, keeps focus, and stops the Escape there", async () => {
    const user = setup();
    // Stands in for a dialog's or menu's Escape handler further out.
    const outer = vi.fn();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") outer();
    };
    window.addEventListener("keydown", onKeyDown);
    onTestFinished(() => {
      window.removeEventListener("keydown", onKeyDown);
    });
    render(<Fixture />);
    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(popupOf(trigger)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(popupOf(trigger)).not.toBeVisible();
    expect(trigger).toHaveFocus();
    expect(outer).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it("hides on a pointer press on the trigger", async () => {
    const user = setup();
    render(<Fixture />);
    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(popupOf(trigger)).toBeVisible();

    await user.pointer({ keys: "[MouseLeft>]", target: trigger });
    expect(popupOf(trigger)).not.toBeVisible();
  });

  it("hides on a press that follows a warm hover at once, before it has rendered", async () => {
    const user = setup();
    render(
      <>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
      </>,
    );
    const one = screen.getByRole("button", { name: "One" });
    const two = screen.getByRole("button", { name: "Two" });
    await user.tab();
    expect(popupOf(one)).toBeVisible();

    // A warm hover requests showing, and the press in the same task requests hiding.
    act(() => {
      fireEvent.pointerOver(two, { pointerType: "mouse" });
      fireEvent.pointerDown(two, { pointerType: "mouse" });
    });
    expect(popupOf(two)).not.toBeVisible();
  });

  it("hides when focus leaves and the pointer isn't on it", async () => {
    const user = setup();
    render(<Fixture />);
    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(popupOf(trigger)).toBeVisible();

    await user.tab();
    expect(popupOf(trigger)).not.toBeVisible();
  });

  it('hides when the trigger\'s aria-expanded turns "true"', async () => {
    const user = setup();
    function Disclosure() {
      const [expanded, setExpanded] = useState(false);
      return (
        <Tooltip content="Shows the details">
          <button
            type="button"
            aria-expanded={expanded}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") setExpanded(true);
            }}
          >
            Details
          </button>
        </Tooltip>
      );
    }
    render(<Disclosure />);
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(popupOf(trigger)).toBeVisible();

    await user.keyboard("{ArrowDown}");
    await act(async () => {
      await Promise.resolve();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(popupOf(trigger)).not.toBeVisible();
  });
});

describe("Tooltip: open state (refinement R14.4)", () => {
  it("starts open with defaultOpen, and reports changes uncontrolled", async () => {
    const user = setup();
    const onOpenChange = vi.fn();
    render(<Fixture defaultOpen onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Save draft" });
    expect(popupOf(trigger)).toBeVisible();

    await user.keyboard("{Escape}");
    expect(popupOf(trigger)).not.toBeVisible();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("follows `open`, and only requests changes through onOpenChange", async () => {
    const user = setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Fixture open={false} onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Save draft" });

    await user.tab();
    await user.tab();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(popupOf(trigger)).not.toBeVisible();

    rerender(<Fixture open onOpenChange={onOpenChange} />);
    expect(popupOf(trigger)).toBeVisible();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(popupOf(trigger)).toBeVisible();
  });

  it("keeps a controlled tooltip shown across re-renders with a new onOpenChange", () => {
    const { rerender } = render(<Fixture open onOpenChange={() => undefined} />);
    const trigger = screen.getByRole("button", { name: "Save draft" });
    const showPopover = vi.spyOn(popupOf(trigger), "showPopover");

    rerender(<Fixture open onOpenChange={() => undefined} />);
    expect(showPopover).not.toHaveBeenCalled();
    expect(popupOf(trigger)).toBeVisible();
  });

  it("marks the requested side before it's measured", () => {
    render(<Fixture side="start" />);
    const popup = popupOf(screen.getByRole("button", { name: "Save draft" }));
    expect(popup).toHaveAttribute("data-side", "start");
    expect(popup).toHaveAttribute("data-placed", "left");
  });
});

describe("Tooltip: around a library trigger (refinement R14.16)", () => {
  it("shows its own bubble instead of an icon-only Button's name tooltip", async () => {
    const user = setup();
    render(
      <Tooltip content="Copies the link to share">
        <Button iconStart="copy" aria-label="Copy link" />
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Copy link" });

    expect(button).toHaveAccessibleDescription("Copies the link to share");
    const popups = document.querySelectorAll("[popover]");
    expect(popups).toHaveLength(1);
    await user.hover(button);
    advance(300);
    expect(popups[0]).toBeVisible();
    expect(popups[0]).toHaveTextContent(/^Copies the link to share$/);
  });

  it("gives the bubble to a disabled Button's reason, and takes it back once enabled", async () => {
    const user = setup();
    const { rerender } = render(
      <Tooltip content="Publishes the post">
        <Button disabled disabledReason="Add a title first">
          Publish
        </Button>
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Publish" });
    const outer = () => document.querySelectorAll("[popover]")[1] as HTMLElement;
    const reason = () => document.querySelectorAll("[popover]")[0] as HTMLElement;

    expect(button).toHaveAccessibleDescription("Publishes the post Add a title first");
    await user.hover(button);
    advance(300);
    expect(reason()).toBeVisible();
    expect(reason()).toHaveTextContent("Add a title first");
    expect(outer()).not.toBeVisible();
    await user.unhover(button);
    advance(150);

    rerender(
      <Tooltip content="Publishes the post">
        <Button>Publish</Button>
      </Tooltip>,
    );
    const only = document.querySelector("[popover]") as HTMLElement;
    expect(only).toHaveTextContent("Publishes the post");
    await user.hover(button);
    advance(300);
    expect(only).toBeVisible();
  });
});

describe("Tooltip: focus back from its own popup (refinement R14.5)", () => {
  it("doesn't show when focus returns from the element the trigger controls", async () => {
    const user = setup();
    render(
      <>
        <button type="button">Before</button>
        <Tooltip content="Opens the panel">
          <button type="button" aria-controls="panel">
            Panel
          </button>
        </Tooltip>
        <div id="panel">
          <button type="button">Inside</button>
        </div>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Panel" });
    const inside = screen.getByRole("button", { name: "Inside" });

    act(() => {
      inside.focus();
    });
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(trigger).toHaveFocus();
    expect(popupOf(trigger)).not.toBeVisible();

    // Coming from anywhere else, it shows as usual.
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.tab();
    expect(trigger).toHaveFocus();
    expect(popupOf(trigger)).toBeVisible();
  });
});

describe("Tooltip: anchors", () => {
  it("removes only its own anchor name, so a tooltip around a library trigger keeps its anchor", () => {
    vi.stubGlobal("CSS", { supports: () => true });
    const { rerender } = render(
      <Tooltip content="Publishes the post">
        <Button disabled disabledReason="Add a title first">
          Publish
        </Button>
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Publish" });
    const names = () =>
      button.style
        .getPropertyValue("anchor-name")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name !== "");
    expect(names()).toHaveLength(2);

    rerender(
      <Tooltip content="Publishes the post">
        <Button>Publish</Button>
      </Tooltip>,
    );
    expect(names()).toHaveLength(1);
    const outer = button.parentElement?.querySelector("[popover]");
    expect((outer as HTMLElement | null)?.style.getPropertyValue("position-anchor")).toBe(
      names()[0],
    );
  });
});

describe("Tooltip: axe", () => {
  it("has no violations closed or open", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<Fixture />);
    await expectNoAxeViolations(container);
    rerender(<Fixture open />);
    await expectNoAxeViolations(container);
    rerender(
      <Tooltip content="Mark as done" kind="name" open>
        <button type="button" aria-label="Mark as done">
          ✓
        </button>
      </Tooltip>,
    );
    await expectNoAxeViolations(container);
  });
});

describe("Tooltip: pointer events on the popup", () => {
  it("ignores a touch leaving the trigger", () => {
    render(<Fixture defaultOpen />);
    const trigger = screen.getByRole("button", { name: "Save draft" });
    fireEvent.pointerLeave(trigger, { pointerType: "touch" });
    advance(1000);
    expect(popupOf(trigger)).toBeVisible();
  });
});
