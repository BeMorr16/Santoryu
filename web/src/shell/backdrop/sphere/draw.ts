import { BANDS, band, type Layout } from "./geometry.ts";
import { rgba, type BandStyle, type Rgba } from "./shading.ts";

/** What one frame draws. The typed arrays are reused from frame to frame. */
export interface Frame {
  layout: Layout;
  count: number;
  /** [sx, sy, depth] per dot, from `project`. */
  projected: Float32Array;
  styles: readonly BandStyle[];
  glow: CanvasGradient;
  /** Dot indices sorted by band (at least `count` long). */
  order: Uint16Array;
  /** BANDS + 1 long: scratch space for the counting sort. */
  bandStarts: Uint16Array;
}

/**
 * The glow behind the sphere (R2.6): from 0.2·R to 1.25·R, full `glow` at the center, 40% of its
 * alpha at 0.6 (the reference's 0.10 → 0.04), and transparent at the edge.
 */
export function glowGradient(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  glow: Rgba,
): CanvasGradient {
  const { cx, cy, radius } = layout;
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.25);
  gradient.addColorStop(0, rgba(glow, glow.a));
  gradient.addColorStop(0.6, rgba(glow, glow.a * 0.4));
  gradient.addColorStop(1, rgba(glow, 0));
  return gradient;
}

/**
 * Clears, fills the glow, buckets the dots by band (a counting sort), then draws each band as one
 * path and one fill, back to front (R5.3): at most BANDS + 1 fills, whatever the dot count.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: Frame,
): void {
  const { layout, count, projected, styles, order, bandStarts } = frame;
  ctx.clearRect(0, 0, width, height);
  // Over a square of side 2.6·R, as the reference does: just past where the glow fades out.
  const half = layout.radius * 1.3;
  ctx.fillStyle = frame.glow;
  ctx.fillRect(layout.cx - half, layout.cy - half, half * 2, half * 2);

  // Count each band into the next slot, then sum, so bandStarts[b] is where band b starts.
  bandStarts.fill(0);
  for (let index = 0; index < count; index++) {
    const slot = band(projected[index * 3 + 2] ?? 0) + 1;
    bandStarts[slot] = (bandStarts[slot] ?? 0) + 1;
  }
  for (let slot = 1; slot <= BANDS; slot++) {
    bandStarts[slot] = (bandStarts[slot] ?? 0) + (bandStarts[slot - 1] ?? 0);
  }
  // Scattering moves each start to its band's end, which is where the next band starts.
  for (let index = 0; index < count; index++) {
    const slot = band(projected[index * 3 + 2] ?? 0);
    const at = bandStarts[slot] ?? 0;
    order[at] = index;
    bandStarts[slot] = at + 1;
  }

  let start = 0;
  for (let slot = 0; slot < BANDS; slot++) {
    const end = bandStarts[slot] ?? start;
    const style = styles[slot];
    if (style && end > start) {
      ctx.beginPath();
      for (let at = start; at < end; at++) {
        const dot = (order[at] ?? 0) * 3;
        const sx = projected[dot] ?? 0;
        const sy = projected[dot + 1] ?? 0;
        ctx.moveTo(sx + style.radius, sy);
        ctx.arc(sx, sy, style.radius, 0, Math.PI * 2);
      }
      ctx.fillStyle = style.fill;
      ctx.fill();
    }
    start = end;
  }
}
