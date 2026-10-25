/**
 * A 2D context for jsdom, which has none: it records the calls the sphere makes, with the fill style
 * current at each fill, so a test can count draw calls and read what was drawn. Nothing is painted.
 */
export interface RecordedCall {
  name: "clearRect" | "fillRect" | "beginPath" | "moveTo" | "arc" | "fill" | "setTransform";
  args: readonly unknown[];
  fillStyle: unknown;
}

export interface FakeContext {
  context: CanvasRenderingContext2D;
  calls: RecordedCall[];
}

export function fakeContext(): FakeContext {
  const calls: RecordedCall[] = [];
  const state = { fillStyle: "" as unknown };
  const record =
    (name: RecordedCall["name"]) =>
    (...args: unknown[]) => {
      calls.push({ name, args, fillStyle: state.fillStyle });
    };
  const context = {
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: unknown) {
      state.fillStyle = value;
    },
    clearRect: record("clearRect"),
    fillRect: record("fillRect"),
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    arc: record("arc"),
    fill: record("fill"),
    setTransform: record("setTransform"),
    createRadialGradient: (...args: unknown[]) => {
      const stops: [number, string][] = [];
      return {
        args,
        stops,
        addColorStop: (offset: number, color: string) => stops.push([offset, color]),
      };
    },
  };
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

/**
 * A 1×1 probe for `readBackdropColors`: reading a pixel returns the bytes `palette` gives the last
 * fill style set, or transparent black for anything else.
 */
export function fakeProbe(
  palette: ReadonlyMap<string, readonly [number, number, number, number]>,
): CanvasRenderingContext2D {
  let fillStyle = "";
  return {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
    clearRect: () => undefined,
    fillRect: () => undefined,
    getImageData: () => ({ data: Uint8ClampedArray.from(palette.get(fillStyle) ?? [0, 0, 0, 0]) }),
  } as unknown as CanvasRenderingContext2D;
}
