import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installResizeObserver } from "./resize-observer.ts";
import { installSystemTheme, setSystemTheme } from "./system-theme.ts";

installSystemTheme();
installResizeObserver();

afterEach(() => {
  cleanup();
  setSystemTheme("light");
});

/**
 * Minimal popover API shim (design §9.10): jsdom 30 has none. showPopover/hidePopover toggle a
 * `data-popover-open` attribute and fire `toggle` with newState and oldState, as a browser does
 * (there, a task later; here, at once). `:popover-open` matches open ones. A UA-like rule hides
 * closed popovers so role queries and visibility match a browser. Real top-layer behavior,
 * popovertarget and light dismiss are covered by the Playwright tests.
 */
if (!("showPopover" in HTMLElement.prototype)) {
  const OPEN = "data-popover-open";
  const check = (element: HTMLElement, wantOpen: boolean) => {
    if (!element.hasAttribute("popover")) {
      throw new DOMException("Not a popover", "NotSupportedError");
    }
    if (element.hasAttribute(OPEN) === wantOpen) {
      throw new DOMException(
        `Popover is already ${wantOpen ? "open" : "closed"}`,
        "InvalidStateError",
      );
    }
  };
  const toggled = (element: HTMLElement, newState: "open" | "closed") => {
    const oldState = newState === "open" ? "closed" : "open";
    element.dispatchEvent(Object.assign(new Event("toggle"), { newState, oldState }));
  };
  Object.assign(HTMLElement.prototype, {
    showPopover(this: HTMLElement) {
      check(this, true);
      this.setAttribute(OPEN, "");
      toggled(this, "open");
    },
    hidePopover(this: HTMLElement) {
      check(this, false);
      this.removeAttribute(OPEN);
      toggled(this, "closed");
    },
  });
  const nativeMatches = Object.getOwnPropertyDescriptor(Element.prototype, "matches")?.value as (
    this: Element,
    selectors: string,
  ) => boolean;
  Object.assign(Element.prototype, {
    matches(this: Element, selectors: string): boolean {
      return selectors === ":popover-open"
        ? this.hasAttribute(OPEN)
        : nativeMatches.call(this, selectors);
    },
  });
  const style = document.createElement("style");
  // jsdom's UA sheet hides every [popover] (:popover-open never matches) and its cascade ranks
  // UA rules by specificity alone, so the open rule needs !important to win.
  style.textContent = `[popover]:not([${OPEN}]) { display: none; } [popover][${OPEN}] { display: block !important; }`;
  document.head.append(style);
}

/**
 * jsdom has no Web Animations API. Accordion waits on its panel's animations (refinement design
 * §14.2); with none listed, a panel settles at once, as under reduced motion.
 */
if (!("getAnimations" in Element.prototype)) {
  Object.assign(Element.prototype, {
    getAnimations(): Animation[] {
      return [];
    },
  });
}

/**
 * Minimal modal dialog shim (theme-creator design §16): jsdom 30 has no showModal. showModal and
 * close toggle `open` and fire `close`; Escape fires a cancelable `cancel` at the open modal, then
 * closes it unless that was canceled, as a browser's close watcher does. The top layer, inertness
 * and the browser's own focus handling are covered by the Playwright tests.
 */
if (!("showModal" in HTMLDialogElement.prototype)) {
  const modals: HTMLDialogElement[] = [];
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      if (this.open) throw new DOMException("Dialog is already open", "InvalidStateError");
      this.setAttribute("open", "");
      modals.push(this);
    },
    close(this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute("open");
      modals.splice(modals.indexOf(this), 1);
      this.dispatchEvent(new Event("close"));
    },
  });
  document.addEventListener("keydown", (event) => {
    const modal = modals.at(-1);
    if (event.key !== "Escape" || event.defaultPrevented || !modal) return;
    if (modal.dispatchEvent(new Event("cancel", { cancelable: true }))) modal.close();
  });
}

/**
 * Range keyboard shim: jsdom and user-event don't step `<input type="range">`. Arrow keys move one
 * step and Home/End go to the ends, firing input and change as a browser does, so components
 * built on the native range can be tested from the keyboard. Real stepping is covered by e2e.
 */
document.addEventListener("keydown", (event) => {
  const input = event.target;
  if (event.defaultPrevented || !(input instanceof HTMLInputElement) || input.type !== "range") {
    return;
  }
  if (input.disabled) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = input.step === "any" ? 1 : Number(input.step || 1);
  const moves: Record<string, (value: number) => number> = {
    ArrowRight: (value) => value + step,
    ArrowUp: (value) => value + step,
    ArrowLeft: (value) => value - step,
    ArrowDown: (value) => value - step,
    Home: () => min,
    End: () => max,
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  const next = String(Math.min(max, Math.max(min, move(input.valueAsNumber))));
  if (next === input.value) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
