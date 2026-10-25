import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import buttonStyles from "../shared/button-styles.module.css";
import { BackToTop } from "./BackToTop.tsx";
import styles from "./BackToTop.module.css";

const scrollTo = vi.fn();

/** jsdom never scrolls; this sets the position the component reads and tells it, as a scroll would. */
function scrollPageTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

const wideQuery = "(min-width: 48em)";
const motionQuery = "(prefers-reduced-motion: no-preference)";
/** The emulated viewport: wide (size.breakpoint.md and up) and no motion preference, or not. */
const media = { wide: true, motion: false };
const wideListeners = new Set<EventListener>();

function mockMedia() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        media: query,
        get matches() {
          if (query === wideQuery) return media.wide;
          return query === motionQuery && media.motion;
        },
        onchange: null,
        addEventListener: (_type: string, listener: EventListener) => {
          if (query === wideQuery) wideListeners.add(listener);
        },
        removeEventListener: (_type: string, listener: EventListener) => {
          wideListeners.delete(listener);
        },
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** Resizes the emulated viewport across 48em and notifies listeners, as a real resize would. */
function setWide(wide: boolean) {
  media.wide = wide;
  act(() => {
    for (const listener of wideListeners) listener(new Event("change"));
  });
}

const button = () => screen.getByRole("button", { name: "Back to top", hidden: true });

beforeEach(() => {
  media.wide = true;
  media.motion = false;
  mockMedia();
  vi.spyOn(window, "scrollTo").mockImplementation(scrollTo);
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  scrollTo.mockReset();
  wideListeners.clear();
});

describe("BackToTop: visibility (ds-components R5.3, R5.9)", () => {
  it("is hidden at the top of the page", () => {
    render(<BackToTop />);

    expect(button()).not.toHaveAttribute("data-visible");
    expect(button()).toHaveClass(styles.backToTop ?? "");
  });

  it("shows once scrolled past one viewport height, and hides again above it", () => {
    render(<BackToTop />);

    scrollPageTo(window.innerHeight);
    expect(button()).not.toHaveAttribute("data-visible");

    scrollPageTo(window.innerHeight + 1);
    expect(button()).toHaveAttribute("data-visible");

    scrollPageTo(10);
    expect(button()).not.toHaveAttribute("data-visible");
  });

  it("follows a resize that moves the default threshold", () => {
    render(<BackToTop />);
    scrollPageTo(500);
    expect(button()).not.toHaveAttribute("data-visible");

    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(button()).toHaveAttribute("data-visible");
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
  });

  it("takes its threshold from the threshold prop", () => {
    render(<BackToTop threshold={200} />);

    scrollPageTo(201);

    expect(button()).toHaveAttribute("data-visible");
  });

  it.each([
    [true, 0, true],
    [false, 5000, false],
  ])("visible={%s} overrides the scroll position (%ipx)", (visible, y, shown) => {
    render(<BackToTop visible={visible} />);

    scrollPageTo(y);

    if (shown) expect(button()).toHaveAttribute("data-visible");
    else expect(button()).not.toHaveAttribute("data-visible");
  });

  it("stays shown while it has focus, then hides once focus leaves above the threshold", () => {
    render(<BackToTop />);
    scrollPageTo(5000);
    act(() => {
      button().focus();
    });

    scrollPageTo(0);
    expect(button()).toHaveAttribute("data-visible");

    act(() => {
      button().blur();
    });
    expect(button()).not.toHaveAttribute("data-visible");
  });

  it("never shows itself in the corner below 48em, however far the page scrolls (owner, 2026-10-21)", () => {
    media.wide = false;
    render(<BackToTop />);

    scrollPageTo(5000);
    expect(button()).not.toHaveAttribute("data-visible");

    setWide(true);
    expect(button()).toHaveAttribute("data-visible");

    setWide(false);
    expect(button()).not.toHaveAttribute("data-visible");
  });

  it("below 48em, still shows inline once scrolled, and still follows visible", () => {
    media.wide = false;
    render(
      <>
        <BackToTop placement="inline" label="Inline" />
        <BackToTop visible label="Forced" />
      </>,
    );

    scrollPageTo(5000);

    expect(screen.getByRole("button", { name: "Inline", hidden: true })).toHaveAttribute(
      "data-visible",
    );
    expect(screen.getByRole("button", { name: "Forced", hidden: true })).toHaveAttribute(
      "data-visible",
    );
  });

  it("is prerendered hidden, even when the page loads scrolled down", () => {
    Object.defineProperty(window, "scrollY", { value: 5000, configurable: true });

    expect(renderToString(<BackToTop />)).not.toContain("data-visible");
  });

  // With showLabel, since an icon-only Button's name tooltip sets its anchor styles once mounted.
  it.each([false, true])("hydrates cleanly (visible: %s)", (visible) => {
    expectHydratesCleanly(<BackToTop visible={visible} showLabel />);
  });
});

describe("BackToTop: name and label (ds-components R5.4)", () => {
  it('is an icon-only button named "Back to top", with its name as a tooltip', () => {
    render(<BackToTop visible />);

    expect(button()).toHaveClass(buttonStyles.iconOnly ?? "");
    expect(button().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const popup = button().nextElementSibling;
    expect(popup).toHaveAttribute("popover");
    expect(popup).toHaveTextContent("Back to top");
  });

  it("takes its name from label", () => {
    render(<BackToTop visible label="Top of page" />);

    expect(screen.getByRole("button", { name: "Top of page" })).toBeInTheDocument();
  });

  it("shows the label as text with showLabel, and then has no name tooltip", () => {
    render(<BackToTop visible showLabel />);

    expect(button()).toHaveTextContent("Back to top");
    expect(button()).not.toHaveClass(buttonStyles.iconOnly ?? "");
    expect(button().nextElementSibling).toBeNull();
  });
});

describe("BackToTop: activation (ds-components R5.5)", () => {
  function renderPage(ui = <BackToTop visible />, { heading = true } = {}) {
    render(
      <>
        <main tabIndex={-1}>
          {heading && <h1>Page title</h1>}
          <p>Content</p>
        </main>
        {ui}
      </>,
    );
  }

  it("scrolls to the top instantly when motion isn't allowed, and focuses main's h1", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(button());

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
    const heading = screen.getByRole("heading", { name: "Page title" });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("scrolls smoothly when prefers-reduced-motion is no-preference", async () => {
    const user = userEvent.setup();
    media.motion = true;
    renderPage();

    await user.click(button());

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("focuses main when the page has no h1", async () => {
    const user = userEvent.setup();
    renderPage(<BackToTop visible />, { heading: false });

    await user.click(button());

    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("focuses the element focusTarget returns", async () => {
    const user = userEvent.setup();
    renderPage(
      <>
        <p id="target">Target</p>
        <BackToTop visible focusTarget={() => document.getElementById("target")} />
      </>,
    );

    await user.click(button());

    expect(screen.getByText("Target")).toHaveFocus();
  });

  it("only scrolls when there is nothing to focus", async () => {
    const user = userEvent.setup();
    render(<BackToTop visible />);

    await user.click(button());

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(button()).toHaveFocus();
  });

  it.each(["{Enter}", " "])("activates with %s", async (key) => {
    const user = userEvent.setup();
    renderPage();
    act(() => {
      button().focus();
    });

    await user.keyboard(key);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Page title" })).toHaveFocus();
  });

  it("runs the caller's onClick first, and does nothing more if it prevents the default", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    renderPage(<BackToTop visible onClick={onClick} />);

    await user.click(button());

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(button()).toHaveFocus();
  });

  it("calls the caller's onFocus and onBlur", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<BackToTop visible onFocus={onFocus} onBlur={onBlur} />);

    fireEvent.focus(button());
    fireEvent.blur(button());

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe("BackToTop: look and props", () => {
  it("is a secondary, medium Button fixed in the corner by default (ds-components R5.3, R5.7)", () => {
    render(<BackToTop visible />);

    expect(button()).toHaveClass(
      buttonStyles.button ?? "",
      buttonStyles.secondary ?? "",
      buttonStyles.md ?? "",
      styles.corner ?? "",
    );
  });

  it("sits in the flow with placement inline", () => {
    render(<BackToTop visible placement="inline" />);

    expect(button()).not.toHaveClass(styles.corner ?? "");
  });

  it("takes Button's variant and size", () => {
    render(<BackToTop visible variant="primary" size="sm" />);

    expect(button()).toHaveClass(buttonStyles.primary ?? "", buttonStyles.sm ?? "");
  });

  it("passes native props, className and ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<BackToTop visible ref={ref} id="top" className="custom" data-testid="back" />);

    expect(ref.current).toBe(button());
    expect(button()).toHaveAttribute("id", "top");
    expect(button()).toHaveAttribute("data-testid", "back");
    expect(button()).toHaveClass("custom", styles.backToTop ?? "");
  });

  it.each([true, false])("has no axe violations (visible: %s)", async (visible) => {
    const { container } = render(<BackToTop visible={visible} />);

    await expectNoAxeViolations(container);
  });
});
