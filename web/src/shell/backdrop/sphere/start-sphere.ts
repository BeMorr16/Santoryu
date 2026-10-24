import { subscribe } from "../../../theme/preference.ts";
import { readBackdropPaused, subscribeBackdropPaused } from "../motion-preference.ts";
import { readBackdropColors } from "./colors.ts";
import { drawFrame, glowGradient, type Frame } from "./draw.ts";
import {
  BANDS,
  BASE_TILT,
  MAX_DOTS,
  MAX_PIXEL_RATIO,
  MAX_STEP,
  POINTER_TILT,
  SPIN_SPEED,
  ballPoints,
  dotCount,
  easeFactor,
  project,
  sphereLayout,
} from "./geometry.ts";
import { bandStyles } from "./shading.ts";

export interface SphereOptions {
  /** Called once, after the first frame is drawn. */
  onFirstFrame?: () => void;
  /** Where the points come from; tests pass a seeded one. */
  random?: () => number;
}

/**
 * Starts drawing the sphere on `canvas` (site-backdrop design §6.4) and returns stop(). Does
 * nothing, and never throws, without a 2D context (R6.4).
 */
export function startSphere(canvas: HTMLCanvasElement, options: SphereOptions = {}): () => void {
  const { onFirstFrame, random = Math.random } = options;
  const ctx = canvas.getContext("2d");
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = probeCanvas.height = 1;
  const probe = probeCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !probe) return () => undefined;

  // Generated once and drawn N at a time, so a resize never reshuffles the sphere (design D1).
  const points = ballPoints(MAX_DOTS, random);
  const narrowQuery = window.matchMedia(
    `(width < ${getComputedStyle(canvas).getPropertyValue("--size-breakpoint-md").trim()})`,
  );
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forcedQuery = window.matchMedia("(forced-colors: active)");

  /** The token colors as band styles and a glow color, read at start and on theme changes (R5.5). */
  const shade = () => {
    const colors = readBackdropColors(canvas, probe);
    return { styles: bandStyles(colors.near, colors.far), glow: colors.glow };
  };

  let { styles, glow } = shade();
  let width = 0;
  let height = 0;
  let frame: Frame | undefined;
  let spin = 0;
  let tiltX = BASE_TILT;
  let tiltY = 0;
  let targetX = BASE_TILT;
  let targetY = 0;
  let frameId = 0;
  let last: number | undefined;
  let drawn = false;
  let stopped = false;

  const layOut = () => {
    if (width === 0 || height === 0) return;
    const narrow = narrowQuery.matches;
    const layout = sphereLayout(width, height, narrow);
    frame = {
      layout,
      count: dotCount(width, height, narrow),
      projected: frame?.projected ?? new Float32Array(MAX_DOTS * 3),
      styles,
      glow: glowGradient(ctx, layout, glow),
      order: frame?.order ?? new Uint16Array(MAX_DOTS),
      bandStarts: frame?.bandStarts ?? new Uint16Array(BANDS + 1),
    };
  };

  const render = () => {
    if (!frame) return;
    project(points, frame.count, spin + tiltY, tiltX, frame.layout, frame.projected);
    drawFrame(ctx, width, height, frame);
    if (!drawn) {
      drawn = true;
      onFirstFrame?.();
    }
  };

  /**
   * Draws now, whether or not a loop is running: resizing the canvas clears it before the next
   * paint, and a still frame has no loop to redraw it (R2.8, R5.1, R6.7).
   */
  const redraw = () => {
    if (!forcedQuery.matches) render();
  };

  const tick = (now: number) => {
    // The first frame after a start or a return to the tab moves nothing (R5.2).
    const dt = last === undefined ? 0 : Math.min(MAX_STEP, (now - last) / 1000);
    last = now;
    spin += SPIN_SPEED * dt;
    const ease = easeFactor(dt);
    tiltX += (targetX - tiltX) * ease;
    tiltY += (targetY - tiltY) * ease;
    render();
    frameId = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    targetX = BASE_TILT + (event.clientY / window.innerHeight - 0.5) * POINTER_TILT;
    targetY = (event.clientX / window.innerWidth - 0.5) * POINTER_TILT;
  };

  /** Runs the loop, draws one still frame, or does nothing, to match the page's state now. */
  const sync = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    window.removeEventListener("pointermove", onPointerMove);
    // Forced colors hide the canvas (R6.2).
    if (forcedQuery.matches) return;
    if (reducedQuery.matches) {
      spin = 0;
      tiltX = targetX = BASE_TILT;
      tiltY = targetY = 0;
      render();
      return;
    }
    // Paused with the header's toggle: still, where it is, so releasing it doesn't jump (R6.7).
    if (readBackdropPaused()) {
      targetX = tiltX;
      targetY = tiltY;
      render();
      return;
    }
    if (document.hidden) return;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    last = undefined;
    frameId = requestAnimationFrame(tick);
  };

  const onNarrowChange = () => {
    layOut();
    redraw();
  };

  const observer = new ResizeObserver(([entry]) => {
    const box = entry?.contentBoxSize[0];
    width = box?.inlineSize ?? 0;
    height = box?.blockSize ?? 0;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    // Resizing the backing store resets the context, so the scale is set after it.
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    layOut();
    redraw();
  });

  // preference.ts applies the new theme before notifying, so the computed colors are current (R3.3).
  const unsubscribe = subscribe(() => {
    ({ styles, glow } = shade());
    if (frame) {
      frame.styles = styles;
      frame.glow = glowGradient(ctx, frame.layout, glow);
    }
    redraw();
  });
  const unsubscribePause = subscribeBackdropPaused(sync);

  observer.observe(canvas);
  narrowQuery.addEventListener("change", onNarrowChange);
  reducedQuery.addEventListener("change", sync);
  forcedQuery.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  sync();

  return () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    unsubscribe();
    unsubscribePause();
    narrowQuery.removeEventListener("change", onNarrowChange);
    reducedQuery.removeEventListener("change", sync);
    forcedQuery.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointermove", onPointerMove);
  };
}
