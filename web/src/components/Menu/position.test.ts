import { describe, expect, it } from "vitest";
import { placePopup, type Rect } from "./position.ts";

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
