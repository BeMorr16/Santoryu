// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeContext, fakeProbe, type RecordedCall } from "../../../../test/fake-canvas-context.ts";
import { installResizeObserver, resize } from "../../../../test/resize-observer.ts";
import { seededRandom } from "../../../../test/seeded-random.ts";
import { writeBackdropPaused } from "../motion-preference.ts";
import {
  BANDS,
  BASE_TILT,
  MAX_DOTS,
  MAX_STEP,
  POINTER_TILT,
  SPIN_SPEED,
  ballPoints,
  dotCount,
  project,
  sphereLayout,
} from "./geometry.ts";
import { startSphere } from "./start-sphere.ts";

/** The emulated media state, and the listeners on each query the engine asks about. */
const media = { reduced: false, forced: false, narrow: false };
const mediaListeners = new Map<keyof typeof media, Set<() => void>>();
const featureOf = (query: string): keyof typeof media | undefined => {
  if (query.includes("prefers-reduced-motion: reduce")) return "reduced";
  if (query.includes("forced-colors: active")) return "forced";
  if (query.includes("width <")) return "narrow";
  return undefined;
};

function setMedia(feature: keyof typeof media, matches: boolean) {
  media[feature] = matches;
  for (const listener of mediaListeners.get(feature) ?? []) listener();
}

let hidden = false;
function setHidden(value: boolean) {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
}

/** A theme change, as another tab's choice arrives: preference.ts re-applies, then notifies (R3.3). */
function changeTheme() {
  window.dispatchEvent(new StorageEvent("storage", { key: "theme" }));
}

/** Stand-ins for the token values: the fake probe only needs to tell them apart. */
const palette = new Map<string, readonly [number, number, number, number]>([
  ["near-a", [237, 242, 248, 255]],
  ["near-b", [255, 160, 60, 255]],
  ["far-a", [84, 216, 244, 255]],
  ["glow-a", [84, 216, 244, 61]],
]);

let canvas: HTMLCanvasElement;
let context: ReturnType<typeof fakeContext>;
let probe: CanvasRenderingContext2D;
let contextAvailable = true;

beforeEach(() => {
  installResizeObserver();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        media: query,
        get matches() {
          const feature = featureOf(query);
          return feature ? media[feature] : false;
        },
        addEventListener: (_type: string, listener: () => void) => {
          const feature = featureOf(query);
          if (!feature) return;
          const listeners = mediaListeners.get(feature) ?? new Set();
          listeners.add(listener);
          mediaListeners.set(feature, listeners);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          const feature = featureOf(query);
          if (feature) mediaListeners.get(feature)?.delete(listener);
        },
      }) as unknown as MediaQueryList,
  );
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  canvas = document.createElement("canvas");
  canvas.style.setProperty("--size-breakpoint-md", "48rem");
  canvas.style.setProperty("--color-backdrop-dot-near", "near-a");
  canvas.style.setProperty("--color-backdrop-dot-far", "far-a");
  canvas.style.setProperty("--color-backdrop-glow", "glow-a");
  document.body.append(canvas);
  context = fakeContext();
  probe = fakeProbe(palette);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    if (!contextAvailable) return null;
    return this === canvas ? context.context : probe;
  } as typeof HTMLCanvasElement.prototype.getContext);
});

afterEach(() => {
  canvas.remove();
  Object.assign(media, { reduced: false, forced: false, narrow: false });
  mediaListeners.clear();
  hidden = false;
  contextAvailable = true;
  writeBackdropPaused(false);
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Starts the sphere on a wide 3000×2000 canvas: 2,400 dots, the most it draws. */
function start(options: Parameters<typeof startSphere>[1] = {}) {
  const stop = startSphere(canvas, { random: seededRandom(1), ...options });
  resize(canvas, 2000, 3000);
  return stop;
}

/** The calls the next animation frame makes. */
function nextFrame(): RecordedCall[] {
  const from = context.calls.length;
  vi.advanceTimersToNextFrame();
  return context.calls.slice(from);
}

const draws = (calls: readonly RecordedCall[]) => calls.filter(({ name }) => name === "clearRect");
const fills = (calls: readonly RecordedCall[]) =>
  calls.filter(({ name }) => name === "fill" || name === "fillRect");
const dotsOf = (calls: readonly RecordedCall[]) =>
  calls.filter(({ name }) => name === "arc").map(({ args }) => [args[0], args[1]]);

/**
 * Expects `dots` to be the seeded points turned to `yaw` and `pitch` on a canvas of this size: the
 * sorted x and y coordinates match to within a hundredth of a pixel.
 */
function expectDotsAt(dots: unknown[][], yaw: number, pitch: number, width = 3000, height = 2000) {
  const count = dotCount(width, height, false);
  const out = new Float32Array(count * 3);
  project(
    ballPoints(MAX_DOTS, seededRandom(1)),
    count,
    yaw,
    pitch,
    sphereLayout(width, height, false),
    out,
  );
  const axis = (values: number[]) => values.sort((a, b) => a - b);
  const expectedX = axis(Array.from({ length: count }, (_, index) => out[index * 3] ?? 0));
  const expectedY = axis(Array.from({ length: count }, (_, index) => out[index * 3 + 1] ?? 0));
  const actualX = axis(dots.map(([x]) => Number(x)));
  const actualY = axis(dots.map(([, y]) => Number(y)));
  expect(actualX).toHaveLength(count);
  const worst = Math.max(
    ...actualX.map((x, index) => Math.abs(x - (expectedX[index] ?? 0))),
    ...actualY.map((y, index) => Math.abs(y - (expectedY[index] ?? 0))),
  );
  expect(worst).toBeLessThan(0.01);
}

/** The listeners on window and document now, by type, from here on. */
function trackListeners() {
  const live = new Map<string, Set<unknown>>();
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    vi.spyOn(target, "addEventListener").mockImplementation((type, listener, options) => {
      live.set(type, (live.get(type) ?? new Set()).add(listener));
      add(type, listener, options);
    });
    vi.spyOn(target, "removeEventListener").mockImplementation((type, listener, options) => {
      live.get(type)?.delete(listener);
      remove(type, listener, options);
    });
  }
  return (type: string) => live.get(type)?.size ?? 0;
}

describe("startSphere: drawing (R2.8, R5.3)", () => {
  it("draws 2,400 dots in at most 17 fills a frame", () => {
    start();

    nextFrame();
    const frame = nextFrame();

    expect(draws(frame)).toHaveLength(1);
    expect(dotsOf(frame)).toHaveLength(MAX_DOTS);
    expect(fills(frame).length).toBeLessThanOrEqual(BANDS + 1);
  });

  it("sizes the backing store at the device pixel ratio and scales the context to match", () => {
    vi.stubGlobal("devicePixelRatio", 3);
    start();

    expect([canvas.width, canvas.height]).toEqual([6000, 4000]);
    expect(context.calls.findLast(({ name }) => name === "setTransform")?.args).toEqual([
      2, 0, 0, 2, 0, 0,
    ]);
  });

  it("calls onFirstFrame once, after the first frame is drawn", () => {
    const onFirstFrame = vi.fn();
    startSphere(canvas, { onFirstFrame });
    nextFrame();
    expect(onFirstFrame).not.toHaveBeenCalled();

    resize(canvas, 2000, 3000);
    nextFrame();
    nextFrame();
    nextFrame();

    expect(onFirstFrame).toHaveBeenCalledOnce();
  });

  it("keeps its points across a resize, drawing fewer of them (design D1)", () => {
    media.reduced = true;
    start();
    const wide = dotsOf(context.calls);

    resize(canvas, 400, 600);
    resize(canvas, 2000, 3000);
    const calls = context.calls;
    const small = dotsOf(
      calls.slice(
        0,
        calls.findLastIndex(({ name }) => name === "clearRect"),
      ),
    );

    expect(wide).toHaveLength(MAX_DOTS);
    expect(small.slice(MAX_DOTS)).toHaveLength(700);
    // Back at the first size, the same points land in the same places.
    expect(dotsOf(calls.slice(calls.findLastIndex(({ name }) => name === "clearRect")))).toEqual(
      wide,
    );
  });

  it("redraws at once when resized while turning, since resizing clears the canvas (R2.8)", () => {
    start();
    nextFrame();
    const from = context.calls.length;

    resize(canvas, 1500, 2500);

    expect(draws(context.calls.slice(from))).toHaveLength(1);
  });

  it("turns at 0.13 rad/s by elapsed time, from the base tilt (R2.4, R5.4)", () => {
    start();
    nextFrame();
    vi.advanceTimersByTime(16 * 29);

    expectDotsAt(dotsOf(nextFrame()), SPIN_SPEED * 0.016 * 30, BASE_TILT);
  });

  it("caps a frame's step at 50 ms, so a slow frame doesn't jump (R5.4)", () => {
    let pending: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      pending = callback;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    start();
    const runAt = (time: number) => {
      const from = context.calls.length;
      pending?.(time);
      return context.calls.slice(from);
    };

    runAt(1000);
    const slow = runAt(3000);

    expectDotsAt(dotsOf(slow), SPIN_SPEED * MAX_STEP, BASE_TILT);
  });

  it("reads the token colors at start and on theme changes, not every frame (R5.5)", () => {
    const reads = vi.spyOn(probe, "getImageData");
    start();
    expect(reads).toHaveBeenCalledTimes(3);

    for (let frame = 0; frame < 10; frame++) nextFrame();
    expect(reads).toHaveBeenCalledTimes(3);

    changeTheme();
    expect(reads).toHaveBeenCalledTimes(6);
  });
});

describe("startSphere: reduced motion (R5.1)", () => {
  it("draws one still frame at the base tilt and schedules none", () => {
    media.reduced = true;
    const onFirstFrame = vi.fn();
    start({ onFirstFrame });

    expect(draws(context.calls)).toHaveLength(1);
    expectDotsAt(dotsOf(context.calls), 0, BASE_TILT);
    expect(onFirstFrame).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("redraws the still frame on resize", () => {
    media.reduced = true;
    start();

    resize(canvas, 1000, 1500);

    expect(draws(context.calls)).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts the loop when reduced motion turns off, and stops it when it turns back on", () => {
    media.reduced = true;
    start();

    setMedia("reduced", false);
    expect(draws(nextFrame())).toHaveLength(1);

    setMedia("reduced", true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("doesn't listen to the pointer", () => {
    const listeners = trackListeners();
    start();
    expect(listeners("pointermove")).toBe(1);

    setMedia("reduced", true);

    expect(listeners("pointermove")).toBe(0);
  });
});

describe("startSphere: hidden page (R5.2)", () => {
  it("runs no frames while hidden, then resumes where it was, without a jump", () => {
    start();
    nextFrame();
    nextFrame();
    const lastShown = dotsOf(nextFrame());

    setHidden(true);
    expect(vi.getTimerCount()).toBe(0);
    const before = context.calls.length;
    vi.advanceTimersByTime(10_000);
    expect(context.calls.length).toBe(before);

    setHidden(false);
    // The first frame back moves nothing; the next moves on from there.
    expect(dotsOf(nextFrame())).toEqual(lastShown);
    expect(dotsOf(nextFrame())).not.toEqual(lastShown);
  });
});

describe("startSphere: forced colors (R6.2)", () => {
  it("runs no loop and draws nothing", () => {
    media.forced = true;
    start();

    expect(vi.getTimerCount()).toBe(0);
    expect(draws(context.calls)).toHaveLength(0);
  });

  it("starts the loop when forced colors turn off", () => {
    media.forced = true;
    start();

    setMedia("forced", false);

    expect(draws(nextFrame())).toHaveLength(1);
  });
});

describe("startSphere: theme changes (R3.3, R5.5)", () => {
  /** The dots of the sixth frame, with `between` run after the third. */
  function sixthFrame(between: () => void = () => undefined) {
    const stop = start();
    nextFrame();
    nextFrame();
    nextFrame();
    between();
    nextFrame();
    nextFrame();
    const frame = nextFrame();
    stop();
    return { dots: dotsOf(frame), fills: fills(frame).map(({ fillStyle }) => fillStyle) };
  }

  it("draws in the new colors without restarting the rotation", () => {
    const before = sixthFrame();
    context.calls.length = 0;

    const after = sixthFrame(() => {
      canvas.style.setProperty("--color-backdrop-dot-near", "near-b");
      changeTheme();
    });

    expect(after.dots).toEqual(before.dots);
    expect(after.fills.slice(1)).not.toEqual(before.fills.slice(1));
  });

  it("redraws the still frame in the new colors under reduced motion", () => {
    media.reduced = true;
    start();
    const first = fills(context.calls).map(({ fillStyle }) => fillStyle);
    const from = context.calls.length;

    canvas.style.setProperty("--color-backdrop-dot-near", "near-b");
    changeTheme();
    const redrawn = context.calls.slice(from);
    const second = fills(redrawn).map(({ fillStyle }) => fillStyle);

    expect(draws(redrawn)).toHaveLength(1);
    expect(second).toHaveLength(first.length);
    expect(second.slice(1)).not.toEqual(first.slice(1));
    expect(dotsOf(redrawn)).toEqual(dotsOf(context.calls.slice(0, from)));
  });
});

describe("startSphere: pointer (R2.7, R5.4)", () => {
  it("eases the tilt toward the pointer over several frames", () => {
    start();
    nextFrame();
    const still = dotsOf(nextFrame());
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 0 }));

    // With no pointer, one more frame only spins a little; toward a corner, each frame tilts more.
    const steps = [nextFrame(), nextFrame(), nextFrame()].map(dotsOf);
    const shift = (dots: unknown[][]) => Math.abs(Number(dots[0]?.[1]) - Number(still[0]?.[1]));

    expect(shift(steps[1] ?? [])).toBeGreaterThan(shift(steps[0] ?? []));
    expect(shift(steps[2] ?? [])).toBeGreaterThan(shift(steps[1] ?? []));
  });

  it("tilts up to 0.35 rad from the base toward a pointer in the corner", () => {
    startSphere(canvas, { random: seededRandom(1) });
    resize(canvas, 400, 600);
    nextFrame();
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 0, clientY: 0 }));
    // 200 frames ease 1 − 0.95^200 of the way: all but a few millionths.
    for (let frame = 1; frame < 200; frame++) {
      context.calls.length = 0;
      nextFrame();
    }

    expectDotsAt(
      dotsOf(nextFrame()),
      SPIN_SPEED * 0.016 * 200 - POINTER_TILT / 2,
      BASE_TILT - POINTER_TILT / 2,
      600,
      400,
    );
  });
});

describe("startSphere: pause toggle (R6.7)", () => {
  it("draws one still frame and runs no loop when paused before it starts", () => {
    writeBackdropPaused(true);
    start();

    expect(draws(context.calls)).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("freezes where it is when paused, and resumes from there without a jump", () => {
    const listeners = trackListeners();
    start();
    nextFrame();
    nextFrame();
    const last = dotsOf(nextFrame());

    const from = context.calls.length;
    writeBackdropPaused(true);
    expect(dotsOf(context.calls.slice(from))).toEqual(last);
    expect(vi.getTimerCount()).toBe(0);
    expect(listeners("pointermove")).toBe(0);
    const before = context.calls.length;
    vi.advanceTimersByTime(1000);
    expect(context.calls.length).toBe(before);

    writeBackdropPaused(false);
    expect(dotsOf(nextFrame())).toEqual(last);
    expect(dotsOf(nextFrame())).not.toEqual(last);
  });
});

describe("startSphere: robustness and stop (R1.4, R6.4)", () => {
  it("does nothing, and doesn't throw, without a 2D context", () => {
    contextAvailable = false;

    const stop = startSphere(canvas);

    expect(vi.getTimerCount()).toBe(0);
    expect(() => {
      stop();
    }).not.toThrow();
  });

  it("removes every listener it added and cancels the frame; a second stop is safe", () => {
    const listeners = trackListeners();
    const stop = start();
    nextFrame();

    stop();
    stop();

    expect(vi.getTimerCount()).toBe(0);
    for (const type of ["pointermove", "visibilitychange", "storage"]) {
      expect(listeners(type), type).toBe(0);
    }
    for (const queryListeners of mediaListeners.values()) expect(queryListeners.size).toBe(0);
    const before = context.calls.length;
    resize(canvas, 800, 1200);
    changeTheme();
    writeBackdropPaused(true);
    expect(context.calls.length).toBe(before);
  });
});
