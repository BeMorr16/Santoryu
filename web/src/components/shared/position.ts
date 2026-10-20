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

/** Logical sides: start and end follow the trigger's `direction`. */
export type Side = "top" | "bottom" | "start" | "end";
/** Along the side: the trigger's start or end edge, or its center. */
export type Align = "start" | "end" | "center";

export interface Placement {
  side: Side;
  align: Align;
  direction?: "ltr" | "rtl" | undefined;
}

/** A physical side, as measured (refinement R14.8). */
export type PlacedSide = "top" | "bottom" | "left" | "right";

/** CSS anchor positioning with `anchor-scope`, or the JS fallback (decision 0007 G). */
export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("anchor-name: --a") &&
    CSS.supports("anchor-scope: --a")
  );
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * The axis the popup sits on: `before` the trigger (above or left) or after it, flipping when it
 * doesn't fit and the opposite side does, then kept `gap` inside the viewport.
 */
function onSide(
  low: number,
  high: number,
  length: number,
  viewport: number,
  gap: number,
  before: boolean,
) {
  const after = high + gap;
  const prior = low - gap - length;
  const fitsAfter = after + length <= viewport - gap;
  const fitsPrior = prior >= gap;
  let value = before ? prior : after;
  if (!before && !fitsAfter && fitsPrior) value = prior;
  if (before && !fitsPrior && fitsAfter) value = after;
  return clamp(value, gap, viewport - gap - length);
}

/**
 * The axis along the side: lined up with the trigger's `low` (top or left) or `high` edge, falling
 * back to the other edge, or centered on it; then shifted to stay `gap` inside the viewport.
 */
function alongSide(
  low: number,
  high: number,
  length: number,
  viewport: number,
  gap: number,
  align: "low" | "high" | "center",
) {
  const lowAligned = low;
  const highAligned = high - length;
  const fitsLow = lowAligned + length <= viewport - gap;
  const fitsHigh = highAligned >= gap;
  let value: number;
  if (align === "center") value = (low + high - length) / 2;
  else if (align === "low") {
    value = fitsLow ? lowAligned : fitsHigh ? highAligned : viewport - gap - length;
  } else value = fitsHigh ? highAligned : fitsLow ? lowAligned : gap;
  return clamp(value, gap, viewport - gap - length);
}

/**
 * Where a popup goes when CSS anchor positioning isn't available (design §9.9): the same rules as
 * the CSS (on the chosen side, flipping or shifting to stay inside the viewport; refinement R5.12,
 * R14.7), with `gap` between the popup and its trigger and from the viewport edges. Viewport
 * coordinates.
 */
export function placePopup(
  trigger: Rect,
  popup: Size,
  viewport: Size,
  gap: number,
  { side, align, direction = "ltr" }: Placement = { side: "bottom", align: "start" },
) {
  const rtl = direction === "rtl";
  if (side === "top" || side === "bottom") {
    const inlineAlign = align === "center" ? align : (align === "start") !== rtl ? "low" : "high";
    return {
      top: onSide(trigger.top, trigger.bottom, popup.height, viewport.height, gap, side === "top"),
      left: alongSide(trigger.left, trigger.right, popup.width, viewport.width, gap, inlineAlign),
    };
  }
  const blockAlign = align === "center" ? align : align === "start" ? "low" : "high";
  return {
    top: alongSide(trigger.top, trigger.bottom, popup.height, viewport.height, gap, blockAlign),
    left: onSide(
      trigger.left,
      trigger.right,
      popup.width,
      viewport.width,
      gap,
      (side === "start") !== rtl,
    ),
  };
}

/**
 * Which side of the trigger a placed popup took (the one with the widest gap), and where along
 * that edge its arrow points at the trigger's center: from the popup's top or left, kept `inset`
 * from both ends, clear of the rounded corners (refinement R14.8). A popup shorter than two insets
 * gets its arrow at its middle.
 */
export function measureArrow(
  trigger: Rect,
  popup: Rect,
  inset: number,
): { side: PlacedSide; offset: number } {
  const gaps: [PlacedSide, number][] = [
    ["top", trigger.top - popup.bottom],
    ["bottom", popup.top - trigger.bottom],
    ["left", trigger.left - popup.right],
    ["right", popup.left - trigger.right],
  ];
  const [side] = gaps.reduce((widest, gap) => (gap[1] > widest[1] ? gap : widest));
  const vertical = side === "top" || side === "bottom";
  const start = vertical ? popup.left : popup.top;
  const length = vertical ? popup.right - popup.left : popup.bottom - popup.top;
  const center = vertical ? (trigger.left + trigger.right) / 2 : (trigger.top + trigger.bottom) / 2;
  const offset = length < 2 * inset ? length / 2 : clamp(center - start, inset, length - inset);
  return { side, offset };
}
