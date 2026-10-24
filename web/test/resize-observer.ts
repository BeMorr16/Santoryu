/**
 * A minimal ResizeObserver for jsdom, which has none. It records what each observer watches, so a
 * test can report a size with `resize`; nothing is measured. Real layout is covered by Playwright.
 */
class FakeResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback;
  readonly targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element): void {
    this.targets.add(target);
    observers.add(this);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    observers.delete(this);
  }

  notify(target: Element, blockSize: number, inlineSize: number): void {
    const size: ResizeObserverSize = { blockSize, inlineSize };
    const entry = {
      target,
      borderBoxSize: [size],
      contentBoxSize: [size],
      devicePixelContentBoxSize: [size],
      contentRect: DOMRectReadOnly.fromRect({ width: inlineSize, height: blockSize }),
    } satisfies ResizeObserverEntry;
    this.#callback([entry], this);
  }
}

const observers = new Set<FakeResizeObserver>();

export function installResizeObserver(): void {
  if (!("ResizeObserver" in globalThis)) globalThis.ResizeObserver = FakeResizeObserver;
}

/** Reports a new box size for `target` to every observer watching it. */
export function resize(target: Element, blockSize: number, inlineSize = 0): void {
  for (const observer of observers) {
    if (observer.targets.has(target)) observer.notify(target, blockSize, inlineSize);
  }
}
