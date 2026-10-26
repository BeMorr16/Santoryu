import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "../../../test/axe.ts";
import { expectHydratesCleanly } from "../../../test/component.tsx";
import { fakeContext, fakeProbe } from "../../../test/fake-canvas-context.ts";
import { resize } from "../../../test/resize-observer.ts";
import styles from "./Backdrop.module.css";
import { SphereCanvas } from "./SphereCanvas.tsx";

let context: ReturnType<typeof fakeContext>;
let getContext: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  context = fakeContext();
  const probe = fakeProbe(new Map());
  // The page's canvas gets the recording context; the engine's detached 1×1 color probe, the fake probe.
  getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
  ): CanvasRenderingContext2D | null {
    return this.isConnected ? context.context : probe;
  } as typeof HTMLCanvasElement.prototype.getContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Waits for the engine's chunk to load and start on the canvas. */
async function engineStarted() {
  await vi.waitFor(() => {
    expect(getContext).toHaveBeenCalled();
  });
}

/** Sizes the canvas and runs one animation frame. */
function drawAFrame(canvas: HTMLCanvasElement) {
  act(() => {
    resize(canvas, 800, 1200);
    vi.advanceTimersToNextFrame();
  });
}

const canvasOf = (container: HTMLElement) => {
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("No canvas");
  return canvas;
};

describe("SphereCanvas", () => {
  it("prerenders a hidden, transparent canvas that hydrates cleanly (R2.1, R5.6)", () => {
    const html = renderToString(<SphereCanvas />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain(styles.ready ?? "ready");
    expectHydratesCleanly(<SphereCanvas />);
  });

  it("fades in once the engine draws its first frame (R2.9)", async () => {
    const { container } = render(<SphereCanvas />);
    const canvas = canvasOf(container);
    expect(canvas).toHaveClass(styles.layer ?? "", styles.sphere ?? "");
    expect(canvas).not.toHaveClass(styles.ready ?? "");

    await engineStarted();
    drawAFrame(canvas);

    expect(canvas).toHaveClass(styles.ready ?? "");
    await expectNoAxeViolations(container);
  });

  it("stops the engine when it unmounts (R1.4)", async () => {
    const { container, unmount } = render(<SphereCanvas />);
    await engineStarted();
    drawAFrame(canvasOf(container));

    unmount();
    const drawn = context.calls.length;
    vi.advanceTimersByTime(1000);

    expect(vi.getTimerCount()).toBe(0);
    expect(context.calls.length).toBe(drawn);
  });

  it("never starts the engine if it unmounts before the engine loads", async () => {
    const { unmount } = render(<SphereCanvas />);
    unmount();

    // The component's handler was registered first, so it has run once this import settles.
    await import("./sphere/start-sphere.ts");
    await Promise.resolve();

    expect(getContext).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stays transparent, and throws nothing, when the engine fails to load (R6.4, decision 0018)", async () => {
    // The chunk download is the boundary here: a failed fetch rejects the dynamic import.
    vi.resetModules();
    vi.doMock("./sphere/start-sphere.ts", () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    const { SphereCanvas: Fresh } = await import("./SphereCanvas.tsx");

    const { container } = render(<Fresh />);
    await vi.waitFor(async () => {
      await expect(import("./sphere/start-sphere.ts")).rejects.toThrow();
    });
    await Promise.resolve();

    expect(canvasOf(container)).not.toHaveClass(styles.ready ?? "");
    expect(getContext).not.toHaveBeenCalled();
    vi.doUnmock("./sphere/start-sphere.ts");
  });
});
