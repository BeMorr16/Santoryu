/** Where focus goes when a page is (re)entered from the top: main's h1, else main itself. */
export function pageFocusTarget(
  main: HTMLElement | null = document.querySelector("main"),
): HTMLElement | null {
  return main?.querySelector("h1") ?? main;
}

/**
 * Moves focus without scrolling to the element. One that can't take focus (such as a page's h1)
 * becomes focusable from script only (tabindex -1); controls keep their place in the tab order.
 */
export function focusWithoutScroll(element: HTMLElement | null): void {
  if (!element) return;
  if (!element.hasAttribute("tabindex") && element.tabIndex < 0) element.tabIndex = -1;
  element.focus({ preventScroll: true });
}
