import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../../test/seeded-random.ts";
import {
  BANDS,
  MAX_DOTS,
  MAX_DOTS_NARROW,
  MIN_DOTS,
  ballPoints,
  band,
  dotCount,
  easeFactor,
  project,
  sphereLayout,
} from "./geometry.ts";

describe("dotCount (R2.2)", () => {
  it("never drops below the minimum", () => {
    expect(dotCount(320, 480, true)).toBe(MIN_DOTS);
    expect(dotCount(0, 0, false)).toBe(MIN_DOTS);
  });

  it("caps at 2,400 when wide and 1,200 when narrow", () => {
    expect(dotCount(3840, 2160, false)).toBe(MAX_DOTS);
    expect(dotCount(3840, 2160, true)).toBe(MAX_DOTS_NARROW);
  });

  it("scales with the viewport's area in between", () => {
    expect(dotCount(1280, 800, false)).toBe(Math.round((1280 * 800) / 1300));
  });
});

describe("ballPoints", () => {
  const count = 4000;
  const points = ballPoints(count, seededRandom(7));
  const radii = Array.from({ length: count }, (_, index) =>
    Math.hypot(points[index * 3] ?? 0, points[index * 3 + 1] ?? 0, points[index * 3 + 2] ?? 0),
  );

  it("places every point inside the unit ball", () => {
    expect(points).toHaveLength(count * 3);
    expect(Math.max(...radii)).toBeLessThanOrEqual(1 + 1e-6);
  });

  it("fills the volume evenly: the mean of r³ is about one half", () => {
    const meanCube = radii.reduce((sum, r) => sum + r ** 3, 0) / count;
    expect(meanCube).toBeCloseTo(0.5, 1);
  });

  it("is the same for the same seed", () => {
    expect(ballPoints(50, seededRandom(3))).toEqual(ballPoints(50, seededRandom(3)));
  });
});

describe("sphereLayout (R2.3)", () => {
  it("sits right of center on wide screens", () => {
    const layout = sphereLayout(1000, 800, false);
    expect(layout.cx).toBeCloseTo(660);
    expect(layout.cy).toBeCloseTo(400);
    expect(layout.radius).toBeCloseTo(368);
  });

  it("is centered and higher when narrow", () => {
    const layout = sphereLayout(400, 800, true);
    expect(layout.cx).toBeCloseTo(200);
    expect(layout.cy).toBeCloseTo(320);
    expect(layout.radius).toBeCloseTo(168);
  });
});

describe("project", () => {
  const layout = { cx: 100, cy: 50, radius: 10 };
  const run = (point: [number, number, number], yaw: number, pitch: number) => {
    const out = new Float32Array(3);
    project(new Float32Array(point), 1, yaw, pitch, layout, out);
    return [...out];
  };

  it("projects the unturned ball orthographically, +z facing the viewer", () => {
    expect(run([1, 0, 0], 0, 0)).toEqual([110, 50, 0.5]);
    expect(run([0, 0, 1], 0, 0)[2]).toBe(1);
    expect(run([0, 0, -1], 0, 0)[2]).toBe(0);
  });

  it("turns +x to the back with a quarter turn of yaw", () => {
    const [sx, , depth] = run([1, 0, 0], Math.PI / 2, 0);
    expect(sx).toBeCloseTo(100);
    expect(depth).toBeCloseTo(0);
  });

  it("tilts +y toward the viewer with a quarter turn of pitch", () => {
    const [, sy, depth] = run([0, 1, 0], 0, Math.PI / 2);
    expect(sy).toBeCloseTo(50);
    expect(depth).toBeCloseTo(1);
  });

  it("keeps depth in [0, 1] and projects only the first count points", () => {
    const points = ballPoints(500, seededRandom(11));
    const out = new Float32Array(500 * 3).fill(-1);
    project(points, 400, 1.3, -0.35, layout, out);
    for (let index = 0; index < 400; index++) {
      expect(out[index * 3 + 2]).toBeGreaterThanOrEqual(0);
      expect(out[index * 3 + 2]).toBeLessThanOrEqual(1);
    }
    expect(out[400 * 3 + 2]).toBe(-1);
  });
});

describe("band", () => {
  it("maps depth 0 to the back band and 1 to the front band", () => {
    expect(band(0)).toBe(0);
    expect(band(1)).toBe(BANDS - 1);
    expect(band(0.5)).toBe(BANDS / 2);
    expect(band(-0.1)).toBe(0);
    expect(band(1.1)).toBe(BANDS - 1);
  });
});

describe("easeFactor (R5.4)", () => {
  it("eases 5% in one 60 Hz frame", () => {
    expect(easeFactor(1 / 60)).toBeCloseTo(0.05, 10);
  });

  it("eases the same over two 120 Hz frames as one 60 Hz frame", () => {
    const remaining = (1 - easeFactor(1 / 120)) ** 2;
    expect(1 - remaining).toBeCloseTo(easeFactor(1 / 60), 10);
  });

  it("doesn't move with no elapsed time", () => {
    expect(easeFactor(0)).toBe(0);
  });
});
