import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resize } from "../../../test/resize-observer.ts";
import { useOverflowFocus } from "./overflow.ts";

function Scroller({ enabled, axis }: { enabled?: boolean; axis?: "inline" | "block" }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focusable = useOverflowFocus(scrollerRef, contentRef, enabled, axis);
  return (
    <div ref={scrollerRef} {...(focusable && { tabIndex: 0 })}>
      <div ref={contentRef} />
    </div>
  );
}

function parts(container: HTMLElement) {
  const scroller = container.firstElementChild;
  const content = scroller?.firstElementChild;
  if (!(scroller instanceof HTMLElement) || !content) throw new Error("No scroller");
  return { scroller, content };
}

/** Gives the scroller a layout (jsdom has none) and reports a resize of `target`. */
function setOverflow(scroller: HTMLElement, overflowing: boolean, target: Element = scroller) {
  Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 300 });
  Object.defineProperty(scroller, "scrollWidth", {
    configurable: true,
    value: overflowing ? 600 : 300,
  });
  act(() => {
    resize(target, 100);
  });
}

describe("useOverflowFocus (refinement R15.5, R16.6)", () => {
  it("is true before hydration", () => {
    const holder = document.createElement("div");
    holder.innerHTML = renderToString(<Scroller />);

    expect(parts(holder).scroller).toHaveAttribute("tabindex", "0");
  });

  it("is true while the scroller overflows and false once it fits", () => {
    const { container } = render(<Scroller />);
    const { scroller } = parts(container);

    setOverflow(scroller, true);
    expect(scroller).toHaveAttribute("tabindex", "0");
    setOverflow(scroller, false);
    expect(scroller).not.toHaveAttribute("tabindex");
    setOverflow(scroller, true);
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("with axis block, follows vertical overflow instead (theme-creator design §11.2)", () => {
    const { container } = render(<Scroller axis="block" />);
    const { scroller } = parts(container);
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 300 });

    setOverflow(scroller, true);
    expect(scroller).not.toHaveAttribute("tabindex");

    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 600 });
    act(() => {
      resize(scroller, 100);
    });
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("measures again when the content resizes", () => {
    const { container } = render(<Scroller />);
    const { scroller, content } = parts(container);
    setOverflow(scroller, false);

    setOverflow(scroller, true, content);

    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("stays true while the scroller has focus, until it blurs", () => {
    const { container } = render(<Scroller />);
    const { scroller } = parts(container);
    setOverflow(scroller, true);
    act(() => {
      scroller.focus();
    });

    setOverflow(scroller, false);
    expect(scroller).toHaveFocus();
    expect(scroller).toHaveAttribute("tabindex", "0");

    act(() => {
      scroller.blur();
    });
    expect(scroller).not.toHaveAttribute("tabindex");
  });

  it("is false and observes nothing when disabled, before and after hydration", () => {
    const observe = vi.spyOn(ResizeObserver.prototype, "observe");
    const holder = document.createElement("div");
    holder.innerHTML = renderToString(<Scroller enabled={false} />);
    expect(parts(holder).scroller).not.toHaveAttribute("tabindex");

    const { container } = render(<Scroller enabled={false} />);
    const { scroller } = parts(container);
    setOverflow(scroller, true);

    expect(scroller).not.toHaveAttribute("tabindex");
    expect(observe).not.toHaveBeenCalled();
    observe.mockRestore();
  });

  it("stops observing on unmount", () => {
    const disconnect = vi.spyOn(ResizeObserver.prototype, "disconnect");
    const { unmount } = render(<Scroller />);

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
    disconnect.mockRestore();
  });
});
