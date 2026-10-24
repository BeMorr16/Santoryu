import { describe, expect, it } from "vitest";
import { fakeContext, type RecordedCall } from "../../../../test/fake-canvas-context.ts";
import { drawFrame, glowGradient, type Frame } from "./draw.ts";
import { BANDS, band } from "./geometry.ts";
import { bandStyles } from "./shading.ts";

const layout = { cx: 300, cy: 200, radius: 100 };
const styles = bandStyles({ r: 240, g: 240, b: 250, a: 1 }, { r: 80, g: 200, b: 240, a: 1 });

/** Dots at these depths, each at x = 10 × its index so a test can tell them apart. */
function frameOf(depths: readonly number[], glow = {} as CanvasGradient): Frame {
  const projected = new Float32Array(depths.length * 3);
  depths.forEach((depth, index) => {
    projected.set([index * 10, 50, depth], index * 3);
  });
  return {
    layout,
    count: depths.length,
    projected,
    styles,
    glow,
    order: new Uint16Array(depths.length),
    bandStarts: new Uint16Array(BANDS + 1),
  };
}

/** The calls between each beginPath and its fill, with the fill's style. */
function paths(calls: readonly RecordedCall[]) {
  const result: { arcs: RecordedCall[]; fill: unknown }[] = [];
  let current: RecordedCall[] | undefined;
  for (const call of calls) {
    if (call.name === "beginPath") current = [];
    else if (call.name === "arc") current?.push(call);
    else if (call.name === "fill" && current) {
      result.push({ arcs: current, fill: call.fillStyle });
      current = undefined;
    }
  }
  return result;
}

describe("drawFrame (R2.5, R5.3)", () => {
  const depths = [0.97, 0.02, 0.5, 0.03, 0.51, 0.99, 0.26];

  it("clears, fills the glow once, then fills at most one path per band", () => {
    const { context, calls } = fakeContext();
    const glow = {} as CanvasGradient;

    drawFrame(context, 600, 400, frameOf(depths, glow));

    expect(calls[0]).toMatchObject({ name: "clearRect", args: [0, 0, 600, 400] });
    expect(calls[1]).toMatchObject({
      name: "fillRect",
      args: [170, 70, 260, 260],
      fillStyle: glow,
    });
    expect(calls.filter(({ name }) => name === "fillRect")).toHaveLength(1);
    const fills = calls.filter(({ name }) => name === "fill");
    expect(fills.length).toBe(new Set(depths.map(band)).size);
    expect(fills.length).toBeLessThanOrEqual(BANDS);
  });

  it("draws the bands back to front, each path holding exactly its band's dots", () => {
    const { context, calls } = fakeContext();

    drawFrame(context, 600, 400, frameOf(depths));

    const drawn = paths(calls);
    const bands = [...new Set(depths.map(band))].sort((a, b) => a - b);
    expect(drawn.map(({ fill }) => fill)).toEqual(bands.map((b) => styles[b]?.fill));
    for (const [index, { arcs }] of drawn.entries()) {
      const expected = depths
        .map((depth, dot) => ({ dot, band: band(depth) }))
        .filter((entry) => entry.band === bands[index])
        .map(({ dot }) => dot * 10);
      expect(arcs.map(({ args }) => args[0]).sort((a, b) => Number(a) - Number(b))).toEqual(
        expected,
      );
      for (const { args } of arcs) expect(args[2]).toBe(styles[bands[index] ?? 0]?.radius);
    }
  });

  it("starts each dot's subpath on its circle, so no line joins the dots", () => {
    const { context, calls } = fakeContext();

    drawFrame(context, 600, 400, frameOf([0.5]));

    const moveTo = calls.find(({ name }) => name === "moveTo");
    const radius = styles[band(0.5)]?.radius ?? 0;
    expect(moveTo?.args).toEqual([radius, 50]);
  });

  it("draws only the first count dots", () => {
    const { context, calls } = fakeContext();
    const frame = { ...frameOf(depths), count: 3 };

    drawFrame(context, 600, 400, frame);

    expect(calls.filter(({ name }) => name === "arc")).toHaveLength(3);
  });
});

describe("glowGradient (R2.6)", () => {
  it("fades the glow from 0.2 to 1.25 radii: full, 40% at 0.6, then transparent", () => {
    const { context } = fakeContext();

    const gradient = glowGradient(context, layout, {
      r: 84,
      g: 216,
      b: 244,
      a: 0.25,
    }) as unknown as {
      args: number[];
      stops: [number, string][];
    };

    expect(gradient.args).toEqual([300, 200, 20, 300, 200, 125]);
    expect(gradient.stops).toEqual([
      [0, "rgba(84, 216, 244, 0.25)"],
      [0.6, "rgba(84, 216, 244, 0.1)"],
      [1, "rgba(84, 216, 244, 0)"],
    ]);
  });
});
