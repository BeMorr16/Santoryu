import type { Rgba } from "./shading.ts";

export interface BackdropColors {
  near: Rgba;
  far: Rgba;
  glow: Rgba;
}

/**
 * Reads --color-backdrop-* from `element`'s computed style and resolves each to sRGB bytes by
 * painting it on a 1×1 canvas, so any CSS color a custom theme produces (hex, rgb, oklch) works.
 */
export function readBackdropColors(
  element: Element,
  probe: CanvasRenderingContext2D,
): BackdropColors {
  const style = getComputedStyle(element);
  const read = (name: string): Rgba => {
    probe.clearRect(0, 0, 1, 1);
    // A value the canvas can't parse leaves the fill as it was, so start from nothing.
    probe.fillStyle = "transparent";
    probe.fillStyle = style.getPropertyValue(name).trim();
    probe.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  return {
    near: read("--color-backdrop-dot-near"),
    far: read("--color-backdrop-dot-far"),
    glow: read("--color-backdrop-glow"),
  };
}
