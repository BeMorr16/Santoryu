/**
 * The sphere's numbers and pure math (site-backdrop design §6.2). Each constant is the reference's
 * (portfolio-sweandrew.vercel.app, inspected 2026-10-24) unless its comment says otherwise.
 */

/** Dot cap on wide screens (reference). */
export const MAX_DOTS = 2400;
/** Dot cap on narrow screens (reference). */
export const MAX_DOTS_NARROW = 1200;
/** Fewest dots, however small the viewport (reference). */
export const MIN_DOTS = 700;
/** CSS px² of viewport per dot (reference). */
export const AREA_PER_DOT = 1300;
/** Turn about the vertical axis, in rad/s (reference). */
export const SPIN_SPEED = 0.13;
/** Resting tilt about the horizontal axis, in rad (reference). */
export const BASE_TILT = -0.35;
/** Tilt across the full viewport of pointer travel, so ±0.35 rad from the center (reference). */
export const POINTER_TILT = 0.7;
/** Share of the way to the target tilt eased per 60 Hz frame (reference: 5% per frame). */
export const EASE_PER_60HZ_FRAME = 0.05;
/** Longest time step, in s, so a slow frame never jumps (R5.4; not in the reference). */
export const MAX_STEP = 0.05;
/** Depth bands, each one path and one fill (R5.3; the reference fills every dot). */
export const BANDS = 16;
/** Highest device pixel ratio drawn at (reference). */
export const MAX_PIXEL_RATIO = 2;

export interface Layout {
  cx: number;
  cy: number;
  radius: number;
}

/** How many dots to draw for a viewport (R2.2). */
export function dotCount(width: number, height: number, narrow: boolean): number {
  const cap = narrow ? MAX_DOTS_NARROW : MAX_DOTS;
  return Math.round(Math.min(cap, Math.max(MIN_DOTS, (width * height) / AREA_PER_DOT)));
}

/** `count` points uniformly inside the unit ball, xyz interleaved. */
export function ballPoints(count: number, random: () => number): Float32Array {
  const points = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    // A uniform direction, then a cube-root radius so the points fill the volume evenly (reference).
    const z = random() * 2 - 1;
    const angle = random() * 2 * Math.PI;
    const ring = Math.sqrt(1 - z * z);
    const r = Math.cbrt(random());
    points[index * 3] = r * ring * Math.cos(angle);
    points[index * 3 + 1] = r * ring * Math.sin(angle);
    points[index * 3 + 2] = r * z;
  }
  return points;
}

/** Where the sphere sits (R2.3): right of center on wide screens, higher and centered when narrow. */
export function sphereLayout(width: number, height: number, narrow: boolean): Layout {
  const short = Math.min(width, height);
  return narrow
    ? { cx: width * 0.5, cy: height * 0.4, radius: short * 0.42 }
    : { cx: width * 0.66, cy: height * 0.5, radius: short * 0.46 };
}

/**
 * Rotates (yaw about y, then pitch about x) and projects the first `count` points into `out` as
 * [sx, sy, depth 0..1] triples. The projection is orthographic, and depth 1 faces the viewer.
 */
export function project(
  points: Float32Array,
  count: number,
  yaw: number,
  pitch: number,
  layout: Layout,
  out: Float32Array,
): void {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const { cx, cy, radius } = layout;
  for (let index = 0; index < count * 3; index += 3) {
    const x = points[index] ?? 0;
    const y = points[index + 1] ?? 0;
    const z = points[index + 2] ?? 0;
    const turnedX = x * cosYaw + z * sinYaw;
    const turnedZ = z * cosYaw - x * sinYaw;
    const tiltedY = y * cosPitch - turnedZ * sinPitch;
    const tiltedZ = y * sinPitch + turnedZ * cosPitch;
    out[index] = cx + turnedX * radius;
    out[index + 1] = cy + tiltedY * radius;
    out[index + 2] = Math.min(1, Math.max(0, (tiltedZ + 1) / 2));
  }
}

/** The depth band a dot falls in: 0 at the back, BANDS − 1 at the front. */
export function band(depth: number): number {
  return Math.min(BANDS - 1, Math.max(0, Math.floor(depth * BANDS)));
}

/** The share of the way to the target to ease over `dt` seconds, the same at any frame rate (R5.4). */
export function easeFactor(dt: number): number {
  return 1 - (1 - EASE_PER_60HZ_FRAME) ** (dt * 60);
}
