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
 * `data-popover-open` attribute, and a UA-like rule hides closed popovers so role queries and
 * visibility match a browser. Real top-layer behavior is covered by the Playwright tests.
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
  Object.assign(HTMLElement.prototype, {
    showPopover(this: HTMLElement) {
      check(this, true);
      this.setAttribute(OPEN, "");
    },
    hidePopover(this: HTMLElement) {
      check(this, false);
      this.removeAttribute(OPEN);
    },
  });
  const style = document.createElement("style");
  // jsdom's UA sheet hides every [popover] (:popover-open never matches) and its cascade ranks
  // UA rules by specificity alone, so the open rule needs !important to win.
  style.textContent = `[popover]:not([${OPEN}]) { display: none; } [popover][${OPEN}] { display: block !important; }`;
  document.head.append(style);
}
