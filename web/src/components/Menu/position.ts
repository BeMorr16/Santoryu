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

export type Side = "bottom" | "top";
export type Align = "start" | "end";

/**
 * Where a menu popup goes when CSS anchor positioning isn't available (design §9.9): the same
 * rules as the CSS (on the chosen side and edge, flipping or shifting to stay inside the viewport;
 * refinement R5.12), with `gap` between the popup and its trigger and from the viewport edges.
 * Viewport coordinates.
 */
export function placePopup(
  trigger: Rect,
  popup: Size,
  viewport: Size,
  gap: number,
  { side, align }: { side: Side; align: Align } = { side: "bottom", align: "start" },
) {
  const clamp = (value: number, max: number) => Math.max(gap, Math.min(value, max));

  const below = trigger.bottom + gap;
  const above = trigger.top - gap - popup.height;
  const fitsBelow = below + popup.height <= viewport.height - gap;
  const fitsAbove = above >= gap;
  let top = side === "bottom" ? below : above;
  if (side === "bottom" && !fitsBelow && fitsAbove) top = above;
  if (side === "top" && !fitsAbove && fitsBelow) top = below;
  top = clamp(top, viewport.height - gap - popup.height);

  const startAligned = trigger.left;
  const endAligned = trigger.right - popup.width;
  const fitsStart = startAligned + popup.width <= viewport.width - gap;
  const fitsEnd = endAligned >= gap;
  let left: number;
  if (align === "start") {
    left = fitsStart ? startAligned : fitsEnd ? endAligned : viewport.width - gap - popup.width;
  } else {
    left = fitsEnd ? endAligned : fitsStart ? startAligned : gap;
  }
  left = clamp(left, viewport.width - gap - popup.width);

  return { top, left };
}
