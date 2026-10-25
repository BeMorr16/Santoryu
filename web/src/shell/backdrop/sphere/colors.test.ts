// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fakeProbe } from "../../../../test/fake-canvas-context.ts";
import { readBackdropColors } from "./colors.ts";

/** Stand-ins for token values: the fake probe only needs to tell them apart. */
const palette = new Map<string, readonly [number, number, number, number]>([
  ["near-value", [237, 242, 248, 255]],
  ["far-value", [84, 216, 244, 255]],
  ["glow-value", [84, 216, 244, 61]],
]);

function canvasWith(values: Record<string, string>) {
  const canvas = document.createElement("canvas");
  for (const [name, value] of Object.entries(values)) canvas.style.setProperty(name, value);
  document.body.append(canvas);
  return canvas;
}

describe("readBackdropColors (R3.1, R5.5)", () => {
  it("reads the three custom properties and resolves each through the probe", () => {
    const canvas = canvasWith({
      "--color-backdrop-dot-near": "near-value",
      "--color-backdrop-dot-far": "far-value",
      "--color-backdrop-glow": "glow-value",
    });

    expect(readBackdropColors(canvas, fakeProbe(palette))).toEqual({
      near: { r: 237, g: 242, b: 248, a: 1 },
      far: { r: 84, g: 216, b: 244, a: 1 },
      glow: { r: 84, g: 216, b: 244, a: 61 / 255 },
    });
    canvas.remove();
  });

  it("reads a missing property as transparent, not as the color read before it", () => {
    const canvas = canvasWith({ "--color-backdrop-dot-near": "near-value" });

    const colors = readBackdropColors(canvas, fakeProbe(palette));

    expect(colors.far).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(colors.glow.a).toBe(0);
    canvas.remove();
  });
});
