// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Module = typeof import("./custom-themes.ts");

// The module caches a snapshot and keeps refused themes in memory, so each test gets a fresh copy.
async function load(): Promise<Module> {
  vi.resetModules();
  return import("./custom-themes.ts");
}

const source = { base: "dark", keys: {}, overrides: { semantic: {}, component: {} } };

function theme(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    scheme: "dark" as const,
    vars: { "--color-action-background": "#7a5618" } as Record<`--${string}`, string>,
    source,
    ...extra,
  };
}

/** The stored text for a list of themes. */
const json = (themes: unknown, v: unknown = 1) => JSON.stringify({ v, themes });

function store(themes: unknown[], v: unknown = 1) {
  localStorage.setItem("custom-themes", json(themes, v));
}

const valid = {
  id: "abcd1234",
  name: "Ocean",
  scheme: "dark",
  vars: { "--color-action-background": "#7a5618" },
  source,
};

function failingStorage() {
  const error = () => {
    throw new DOMException("Storage is disabled", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(error);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(error);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("custom themes store (theme-creator R2.2, R9.5, R9.6)", () => {
  it("saves new themes in creation order, with an 8-character base-36 id", async () => {
    const { readCustomThemes, saveCustomTheme } = await load();

    const ocean = saveCustomTheme(theme("Ocean"));
    saveCustomTheme(theme("Forest"));

    expect(ocean.id).toMatch(/^[a-z0-9]{8}$/);
    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Ocean", "Forest"]);
    expect(JSON.parse(localStorage.getItem("custom-themes") ?? "")).toEqual({
      v: 1,
      themes: readCustomThemes(),
    });
  });

  it("updates a theme in place when saved with its id", async () => {
    const { readCustomThemes, saveCustomTheme } = await load();
    const ocean = saveCustomTheme(theme("Ocean"));
    saveCustomTheme(theme("Forest"));

    saveCustomTheme({ ...theme("Ocean deep"), id: ocean.id, scheme: "light" });

    expect(readCustomThemes().map(({ id, name, scheme }) => [id, name, scheme])).toEqual([
      [ocean.id, "Ocean deep", "light"],
      [expect.any(String), "Forest", "dark"],
    ]);
  });

  it("renames and deletes", async () => {
    const { deleteCustomTheme, readCustomThemes, renameCustomTheme, saveCustomTheme } =
      await load();
    const ocean = saveCustomTheme(theme("Ocean"));
    const forest = saveCustomTheme(theme("Forest"));

    renameCustomTheme(ocean.id, "  Harbor ");
    deleteCustomTheme(forest.id);

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Harbor"]);
  });

  it("rejects a 4th theme (R2.2), but still updates one of the 3", async () => {
    const { readCustomThemes, saveCustomTheme } = await load();
    const first = saveCustomTheme(theme("One"));
    saveCustomTheme(theme("Two"));
    saveCustomTheme(theme("Three"));

    expect(() => saveCustomTheme(theme("Four"))).toThrow(RangeError);
    saveCustomTheme({ ...theme("Uno"), id: first.id });

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Uno", "Two", "Three"]);
  });

  it("refuses to store a theme that wouldn't read back", async () => {
    const { readCustomThemes, saveCustomTheme } = await load();

    expect(() => saveCustomTheme(theme(""))).toThrow(TypeError);
    expect(() => saveCustomTheme(theme("Bad", { vars: { "--color-nope": "red" } }))).toThrow(
      TypeError,
    );
    expect(readCustomThemes()).toEqual([]);
  });

  it("returns the same snapshot while storage is unchanged, and a new one after a change", async () => {
    const { readCustomThemes, saveCustomTheme } = await load();
    store([valid]);

    const first = readCustomThemes();
    expect(readCustomThemes()).toBe(first);

    saveCustomTheme(theme("Forest"));
    const second = readCustomThemes();
    expect(second).not.toBe(first);
    expect(readCustomThemes()).toBe(second);
  });

  it("reads a valid stored list", async () => {
    store([valid]);
    const { findCustomTheme, readCustomThemes } = await load();

    expect(readCustomThemes()).toEqual([valid]);
    expect(findCustomTheme("abcd1234")?.name).toBe("Ocean");
    expect(findCustomTheme("zzzz9999")).toBeUndefined();
  });

  const tooMany = Object.fromEntries(
    Array.from({ length: 601 }, (_, index) => [`--color-x-${String(index)}`, "#000000"]),
  );

  it.each([
    ["non-JSON", "{nope"],
    ["not an object", "[]"],
    ["a wrong version", json([valid], 2)],
    ["themes not a list", json({})],
    ["more than 3 themes", json([valid, valid, valid, valid])],
    ["a bad id", json([{ ...valid, id: "ABCD1234" }])],
    ["a short id", json([{ ...valid, id: "abc" }])],
    ["an empty name", json([{ ...valid, name: "" }])],
    ["a 31-character name", json([{ ...valid, name: "x".repeat(31) }])],
    ["an untrimmed name", json([{ ...valid, name: " Ocean" }])],
    ["a bad scheme", json([{ ...valid, scheme: "sepia" }])],
    ["an unknown property", json([{ ...valid, vars: { "--color-nope": "#000000" } }])],
    ["a property not in --x form", json([{ ...valid, vars: { color: "red" } }])],
    ["a value with ;", json([{ ...valid, vars: { "--color-text-default": "red; x: y" } }])],
    ["a value with {", json([{ ...valid, vars: { "--color-text-default": "red}{" } }])],
    ["a non-string value", json([{ ...valid, vars: { "--color-text-default": 1 } }])],
    [
      "a 201-character value",
      json([{ ...valid, vars: { "--color-text-default": "x".repeat(201) } }]),
    ],
    ["601 entries", json([{ ...valid, vars: tooMany }])],
    ["no source", json([{ ...valid, source: undefined }])],
    ["duplicate ids", json([valid, { ...valid, name: "Other" }])],
    ["duplicate names", json([valid, { ...valid, id: "zzzz9999", name: "OCEAN" }])],
  ])("reads %s as no themes, without throwing (R9.5)", async (_label, raw) => {
    localStorage.setItem("custom-themes", raw);
    const { readCustomThemes } = await load();

    expect(readCustomThemes()).toEqual([]);
  });

  it("keeps themes for the page when storage throws, and says so (R9.6)", async () => {
    const { readCustomThemes, saveCustomTheme, storageAvailable } = await load();
    expect(storageAvailable()).toBe(true);
    failingStorage();

    saveCustomTheme(theme("Ocean"));

    expect(readCustomThemes().map(({ name }) => name)).toEqual(["Ocean"]);
    expect(storageAvailable()).toBe(false);
  });

  it("reports storage as unavailable before any write when it throws", async () => {
    failingStorage();
    const { readCustomThemes, storageAvailable } = await load();

    expect(storageAvailable()).toBe(false);
    expect(readCustomThemes()).toEqual([]);
  });

  it("notifies subscribers of changes here and in other tabs, and not after unsubscribing", async () => {
    const { saveCustomTheme, subscribeCustomThemes } = await load();
    const listener = vi.fn();
    const unsubscribe = subscribeCustomThemes(listener);

    saveCustomTheme(theme("Ocean"));
    window.dispatchEvent(new StorageEvent("storage", { key: "custom-themes" }));
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    saveCustomTheme(theme("Forest"));
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
