export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface Size {
  width: number;
  height: number;
}

/**
 * Where a menu popup goes when CSS anchor positioning isn't available (design §9.9): the same
 * rules as the CSS (below and start-aligned, flipping or shifting to stay inside the viewport),
 * with `gap` between the popup and its trigger and from the viewport edges. Viewport coordinates.
 */
export function placePopup(trigger: Rect, popup: Size, viewport: Size, gap: number) {
  const clamp = (value: number, max: number) => Math.max(gap, Math.min(value, max));

  let top = trigger.bottom + gap;
  const above = trigger.top - gap - popup.height;
  if (top + popup.height > viewport.height - gap && above >= gap) top = above;
  top = clamp(top, viewport.height - gap - popup.height);

  let left = trigger.left;
  if (left + popup.width > viewport.width - gap) {
    const endAligned = trigger.right - popup.width;
    left = endAligned >= gap ? endAligned : viewport.width - gap - popup.width;
  }
  left = clamp(left, viewport.width - gap - popup.width);

  return { top, left };
}
