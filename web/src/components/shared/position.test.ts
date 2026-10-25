import { describe, expect, it } from "vitest";
import { measureArrow, placePopup, type Rect } from "./position.ts";

const viewport = { width: 800, height: 600 };
const popup = { width: 200, height: 150 };
const gap = 8;

function rect(left: number, top: number, width = 100, height = 32): Rect {
  return { left, top, right: left + width, bottom: top + height };
}

describe("placePopup (JS fallback for CSS anchor positioning)", () => {
  it("places the popup below the trigger, aligned to its start edge", () => {
    expect(placePopup(rect(100, 50), popup, viewport, gap)).toEqual({ top: 90, left: 100 });
  });

  it("flips above the trigger when it would overflow the bottom", () => {
    expect(placePopup(rect(100, 500), popup, viewport, gap)).toEqual({ top: 342, left: 100 });
  });

  it("stays below, shifted inward, when it fits neither below nor above", () => {
    const tall = { width: 200, height: 560 };
    expect(placePopup(rect(100, 280), tall, viewport, gap)).toEqual({ top: 32, left: 100 });
  });

  it("aligns to the trigger's end edge when it would overflow the right", () => {
    expect(placePopup(rect(650, 50), popup, viewport, gap)).toEqual({ top: 90, left: 550 });
  });

  it("shifts inward when neither edge alignment fits", () => {
    const wide = { width: 700, height: 150 };
    expect(placePopup(rect(300, 50), wide, viewport, gap)).toEqual({ top: 90, left: 92 });
  });

  it("never starts left of the viewport margin", () => {
    expect(placePopup(rect(-40, 50), popup, viewport, gap)).toEqual({ top: 90, left: 8 });
  });

  it("keeps the margin at the top edge too", () => {
    expect(placePopup(rect(100, -60, 100, 40), popup, viewport, gap)).toEqual({
      top: 8,
      left: 100,
    });
  });

  it("opens above the trigger with side top", () => {
    expect(
      placePopup(rect(100, 300), popup, viewport, gap, { side: "top", align: "start" }),
    ).toEqual({ top: 142, left: 100 });
  });

  it("flips below with side top when there's no room above", () => {
    expect(
      placePopup(rect(100, 50), popup, viewport, gap, { side: "top", align: "start" }),
    ).toEqual({ top: 90, left: 100 });
  });

  it("aligns to the trigger's end edge with align end", () => {
    expect(
      placePopup(rect(300, 50), popup, viewport, gap, { side: "bottom", align: "end" }),
    ).toEqual({ top: 90, left: 200 });
  });

  it("falls back to the start edge with align end when the end would overflow the left", () => {
    expect(
      placePopup(rect(20, 50), popup, viewport, gap, { side: "bottom", align: "end" }),
    ).toEqual({ top: 90, left: 20 });
  });

  it("combines side top and align end", () => {
    expect(placePopup(rect(600, 400), popup, viewport, gap, { side: "top", align: "end" })).toEqual(
      {
        top: 242,
        left: 500,
      },
    );
  });
});

describe("placePopup: centered and inline sides (refinement R14.7)", () => {
  const tip = { width: 120, height: 30 };

  it("centers a top popup on the trigger", () => {
    expect(
      placePopup(rect(300, 300), tip, viewport, gap, { side: "top", align: "center" }),
    ).toEqual({ top: 262, left: 290 });
  });

  it("shifts a centered popup inward at the viewport's left edge", () => {
    expect(
      placePopup(rect(0, 300, 40), tip, viewport, gap, { side: "bottom", align: "center" }),
    ).toEqual({ top: 340, left: 8 });
  });

  it("shifts a centered popup inward at the viewport's right edge", () => {
    expect(
      placePopup(rect(760, 300, 40), tip, viewport, gap, { side: "top", align: "center" }),
    ).toEqual({ top: 262, left: 672 });
  });

  it("places start on the left and end on the right, centered on the trigger", () => {
    const trigger = rect(300, 300);
    expect(placePopup(trigger, tip, viewport, gap, { side: "start", align: "center" })).toEqual({
      top: 301,
      left: 172,
    });
    expect(placePopup(trigger, tip, viewport, gap, { side: "end", align: "center" })).toEqual({
      top: 301,
      left: 408,
    });
  });

  it("flips an inline side that doesn't fit", () => {
    expect(
      placePopup(rect(40, 300), tip, viewport, gap, { side: "start", align: "center" }),
    ).toEqual({ top: 301, left: 148 });
    expect(
      placePopup(rect(660, 300), tip, viewport, gap, { side: "end", align: "center" }),
    ).toEqual({ top: 301, left: 532 });
  });

  it("resolves start and end to the right and left under rtl", () => {
    const trigger = rect(300, 300);
    const rtl = { align: "center", direction: "rtl" } as const;
    expect(placePopup(trigger, tip, viewport, gap, { side: "start", ...rtl })).toEqual({
      top: 301,
      left: 408,
    });
    expect(placePopup(trigger, tip, viewport, gap, { side: "end", ...rtl })).toEqual({
      top: 301,
      left: 172,
    });
  });

  it("aligns start and end to the trigger's right and left edges under rtl", () => {
    const trigger = rect(300, 50);
    expect(
      placePopup(trigger, popup, viewport, gap, {
        side: "bottom",
        align: "start",
        direction: "rtl",
      }),
    ).toEqual({ top: 90, left: 200 });
    expect(
      placePopup(trigger, popup, viewport, gap, { side: "bottom", align: "end", direction: "rtl" }),
    ).toEqual({ top: 90, left: 300 });
  });
});

describe("measureArrow (refinement R14.8)", () => {
  const trigger = rect(300, 300);
  const inset = 14;

  it("names the side the popup took and points at the trigger's center", () => {
    expect(measureArrow(trigger, rect(290, 262, 120, 30), inset)).toEqual({
      side: "top",
      offset: 60,
    });
    expect(measureArrow(trigger, rect(290, 340, 120, 30), inset)).toEqual({
      side: "bottom",
      offset: 60,
    });
    expect(measureArrow(trigger, rect(172, 296, 120, 40), inset)).toEqual({
      side: "left",
      offset: 20,
    });
    expect(measureArrow(trigger, rect(408, 296, 120, 40), inset)).toEqual({
      side: "right",
      offset: 20,
    });
  });

  it("follows a shifted popup", () => {
    expect(measureArrow(rect(0, 300, 40), rect(8, 340, 120, 30), inset)).toEqual({
      side: "bottom",
      offset: 14,
    });
    expect(measureArrow(rect(60, 300, 40), rect(8, 340, 120, 30), inset)).toEqual({
      side: "bottom",
      offset: 72,
    });
  });

  it("stays clear of the rounded corners", () => {
    expect(measureArrow(rect(780, 300, 20), rect(672, 262, 120, 30), inset)).toEqual({
      side: "top",
      offset: 106,
    });
  });

  it("centers the arrow on a popup shorter than two insets", () => {
    expect(measureArrow(trigger, rect(408, 302, 120, 26), inset)).toEqual({
      side: "right",
      offset: 13,
    });
  });
});
