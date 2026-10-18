// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSystemTheme, setSystemTheme } from "../../test/system-theme.ts";

type PreferenceModule = typeof import("./preference.ts");

// The module keeps a refused choice in memory, so each test gets a fresh copy.
async function load(): Promise<PreferenceModule> {
  vi.resetModules();
  return import("./preference.ts");
}

const root = document.documentElement;

function failingStorage() {
  const error = () => {
    throw new DOMException("Storage is disabled", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(error);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(error);
}

function dispatchStorage(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

let consoleCalls: ReturnType<typeof vi.spyOn>[];

beforeEach(() => {
  installSystemTheme();
  setSystemTheme("light");
  localStorage.clear();
  root.removeAttribute("data-theme");
  consoleCalls = (["error", "warn", "log"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  for (const spy of consoleCalls) expect(spy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("readPreference: the visitor's choice", () => {
  it.each(["light", "dark"] as const)("returns a stored %s", async (value) => {
    localStorage.setItem("theme", value);
    const { readPreference } = await load();

    expect(readPreference()).toBe(value);
  });

  it.each([null, "", "system", "Dark", "sepia", '"dark"'])(
    "is null (no choice: follow the OS) for a missing, legacy or invalid value %j",
    async (value) => {
      if (value !== null) localStorage.setItem("theme", value);
      const { readPreference } = await load();

      expect(readPreference()).toBeNull();
    },
  );

  it("is null, without throwing, when storage throws (R13.5)", async () => {
    failingStorage();
    const { readPreference } = await load();

    expect(readPreference()).toBeNull();
  });
});

describe("readEffectiveTheme: what the page shows", () => {
  it.each(["light", "dark"] as const)("follows an OS %s scheme with no choice", async (os) => {
    setSystemTheme(os);
    const { readEffectiveTheme } = await load();

    expect(readEffectiveTheme()).toBe(os);
  });

  it("prefers a stored choice over the OS scheme", async () => {
    setSystemTheme("dark");
    localStorage.setItem("theme", "light");
    const { readEffectiveTheme } = await load();

    expect(readEffectiveTheme()).toBe("light");
  });
});

describe("writePreference", () => {
  it.each(["light", "dark"] as const)(
    "applies %s to <html> and stores it (R13.3)",
    async (value) => {
      const { readPreference, writePreference } = await load();

      writePreference(value);

      expect(root.getAttribute("data-theme")).toBe(value);
      expect(localStorage.getItem("theme")).toBe(value);
      expect(readPreference()).toBe(value);
    },
  );

  it("still applies and reads back for this page when storage throws (R13.5)", async () => {
    failingStorage();
    const { readEffectiveTheme, readPreference, writePreference } = await load();

    writePreference("dark");

    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(readPreference()).toBe("dark");
    expect(readEffectiveTheme()).toBe("dark");
  });

  it("notifies subscribers after applying", async () => {
    const { subscribe, writePreference } = await load();
    const seen: (string | null)[] = [];
    const unsubscribe = subscribe(() => seen.push(root.getAttribute("data-theme")));

    writePreference("light");
    unsubscribe();
    writePreference("dark");

    expect(seen).toEqual(["light"]);
  });
});

describe("applyPreference", () => {
  it("sets data-theme for a choice, and removes it for no choice", async () => {
    const { applyPreference } = await load();
    const element = document.createElement("div");

    applyPreference("dark", element);
    expect(element.getAttribute("data-theme")).toBe("dark");
    applyPreference("light", element);
    expect(element.getAttribute("data-theme")).toBe("light");
    applyPreference(null, element);
    expect(element.hasAttribute("data-theme")).toBe(false);
  });

  it("defaults to <html>", async () => {
    const { applyPreference } = await load();

    applyPreference("dark");

    expect(root.getAttribute("data-theme")).toBe("dark");
  });
});

describe("subscribe", () => {
  it("announces an OS scheme change while there's no choice (R13.6)", async () => {
    const { readEffectiveTheme, subscribe } = await load();
    const listener = vi.fn();
    subscribe(listener);

    setSystemTheme("dark");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(readEffectiveTheme()).toBe("dark");
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("applies and announces a choice made in another tab (R13.7)", async () => {
    const { readPreference, subscribe } = await load();
    const listener = vi.fn();
    subscribe(listener);

    localStorage.setItem("theme", "dark");
    dispatchStorage("theme", "dark");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(readPreference()).toBe("dark");
  });

  it("treats storage cleared in another tab as no choice", async () => {
    const { readPreference, subscribe, writePreference } = await load();
    writePreference("dark");
    const listener = vi.fn();
    subscribe(listener);

    localStorage.clear();
    dispatchStorage(null, null);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(readPreference()).toBeNull();
  });

  it("ignores storage events for other keys", async () => {
    const { subscribe } = await load();
    const listener = vi.fn();
    subscribe(listener);

    dispatchStorage("other", "dark");

    expect(listener).not.toHaveBeenCalled();
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("stops listening after unsubscribe", async () => {
    const { subscribe } = await load();
    const listener = vi.fn();
    subscribe(listener)();

    dispatchStorage("theme", "dark");
    setSystemTheme("dark");

    expect(listener).not.toHaveBeenCalled();
  });
});
