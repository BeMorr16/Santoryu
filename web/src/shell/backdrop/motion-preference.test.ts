// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

type Module = typeof import("./motion-preference.ts");

// The module keeps a refused choice in memory, so each test gets a fresh copy.
async function load(): Promise<Module> {
  vi.resetModules();
  return import("./motion-preference.ts");
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("backdrop motion preference (site-backdrop R6.7)", () => {
  it("isn't paused until the visitor pauses it", async () => {
    const { readBackdropPaused } = await load();

    expect(readBackdropPaused()).toBe(false);
  });

  it("stores a pause, and removes it on release", async () => {
    const { MOTION_STORAGE_KEY, readBackdropPaused, writeBackdropPaused } = await load();

    writeBackdropPaused(true);
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("paused");
    expect(readBackdropPaused()).toBe(true);

    writeBackdropPaused(false);
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    expect(readBackdropPaused()).toBe(false);
  });

  it("reads a pause saved on an earlier visit", async () => {
    localStorage.setItem("backdrop-motion", "paused");
    const { readBackdropPaused } = await load();

    expect(readBackdropPaused()).toBe(true);
  });

  it("keeps the choice for this page when storage refuses it, and never throws", async () => {
    const { readBackdropPaused, writeBackdropPaused } = await load();
    const refuse = () => {
      throw new DOMException("Storage is disabled", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);

    expect(readBackdropPaused()).toBe(false);
    writeBackdropPaused(true);
    expect(readBackdropPaused()).toBe(true);
  });

  it("notifies subscribers of a choice on this page, until they unsubscribe", async () => {
    const { subscribeBackdropPaused, writeBackdropPaused } = await load();
    const listener = vi.fn();
    const unsubscribe = subscribeBackdropPaused(listener);

    writeBackdropPaused(true);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    writeBackdropPaused(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("follows a choice made in another tab, and ignores other keys", async () => {
    const { readBackdropPaused, subscribeBackdropPaused } = await load();
    const listener = vi.fn();
    subscribeBackdropPaused(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "theme" }));
    expect(listener).not.toHaveBeenCalled();

    localStorage.setItem("backdrop-motion", "paused");
    window.dispatchEvent(new StorageEvent("storage", { key: "backdrop-motion" }));
    expect(listener).toHaveBeenCalledOnce();
    expect(readBackdropPaused()).toBe(true);
  });
});
