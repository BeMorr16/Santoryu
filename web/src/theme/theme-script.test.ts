// @vitest-environment jsdom
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { themeScript } from "./theme-script.ts";

const root = document.documentElement;

/** Runs the exact inline script, with only the page globals it may use. */
function runScript() {
  runInNewContext(themeScript, {
    document,
    get localStorage() {
      return window.localStorage;
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-custom-theme");
  root.removeAttribute("data-js");
  root.removeAttribute("style");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pre-paint theme script (R13.4, R13.5)", () => {
  it.each(["light", "dark"])("applies a stored %s and marks JavaScript as available", (value) => {
    localStorage.setItem("theme", value);

    runScript();

    expect(root.getAttribute("data-theme")).toBe(value);
    expect(root.hasAttribute("data-js")).toBe(true);
  });

  it.each([null, "system", "sepia"])("leaves data-theme unset for %j", (value) => {
    if (value !== null) localStorage.setItem("theme", value);

    runScript();

    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.hasAttribute("data-js")).toBe(true);
  });

  it("survives storage that throws, without logging", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runScript).not.toThrow();

    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.hasAttribute("data-js")).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  it("reads the same storage key as the preference module", async () => {
    const { STORAGE_KEY } = await import("./preference.ts");

    expect(themeScript).toContain(`localStorage.getItem("${STORAGE_KEY}")`);
  });
});

describe("pre-paint theme script: custom themes (theme-creator R9.3)", () => {
  const ocean = {
    id: "ocean123",
    name: "Ocean",
    scheme: "dark",
    vars: { "--color-action-background": "#7a5618", "--color-text-default": "#ffffff" },
    source: {},
  };
  const json = (themes: unknown, v: unknown = 1) => JSON.stringify({ v, themes });
  const storeThemes = (themes: unknown) => {
    localStorage.setItem("custom-themes", json(themes));
  };

  /** Nothing of a custom theme reached <html>. */
  const expectNothingApplied = () => {
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.hasAttribute("data-custom-theme")).toBe(false);
    expect(root.getAttribute("style") ?? "").toBe("");
    expect(root.hasAttribute("data-js")).toBe(true);
  };

  it("applies a stored custom theme's scheme, id and properties", () => {
    storeThemes([{ ...ocean, id: "forest12", name: "Forest", scheme: "light" }, ocean]);
    localStorage.setItem("theme", "custom:ocean123");

    runScript();

    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-custom-theme")).toBe("ocean123");
    expect(root.style.getPropertyValue("--color-action-background")).toBe("#7a5618");
    expect(root.style.getPropertyValue("--color-text-default")).toBe("#ffffff");
  });

  const tooMany = Object.fromEntries(
    Array.from({ length: 601 }, (_, index) => [`--color-x-${String(index)}`, "#000000"]),
  );

  it.each([
    ["no stored themes", null],
    ["non-JSON themes", "{nope"],
    ["a wrong version", json([ocean], 2)],
    ["themes not a list", json({ 0: ocean })],
    ["an unknown id", json([{ ...ocean, id: "other123" }])],
    ["a bad scheme", json([{ ...ocean, scheme: "sepia" }])],
    ["no vars", json([{ ...ocean, vars: null }])],
    ["a name not in --x form", json([{ ...ocean, vars: { color: "red" } }])],
    ["a value with ;", json([{ ...ocean, vars: { "--color-x": "red; x: y" } }])],
    ["a value with }", json([{ ...ocean, vars: { "--color-x": "red}" } }])],
    ["a non-string value", json([{ ...ocean, vars: { "--color-x": 1 } }])],
    ["a 201-character value", json([{ ...ocean, vars: { "--color-x": "x".repeat(201) } }])],
    ["601 entries", json([{ ...ocean, vars: tooMany }])],
  ])("applies nothing for %s", (_label, raw) => {
    if (raw !== null) localStorage.setItem("custom-themes", raw);
    localStorage.setItem("theme", "custom:ocean123");

    runScript();

    expectNothingApplied();
  });

  it("applies nothing, without logging, when reading the themes throws", () => {
    localStorage.setItem("theme", "custom:ocean123");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
      if (key === "theme") return "custom:ocean123";
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(runScript).not.toThrow();

    expectNothingApplied();
    expect(error).not.toHaveBeenCalled();
  });

  it("reads the same storage key as the custom themes store", async () => {
    const { CUSTOM_THEMES_KEY } = await import("./custom-themes.ts");

    expect(themeScript).toContain(`localStorage.getItem("${CUSTOM_THEMES_KEY}")`);
  });

  it("stays ES5 and tiny: no arrows, const, let, template literals, ?. or ??, under 2 KB", () => {
    for (const modern of ["=>", "const ", "let ", "`", "?.", "??"]) {
      expect(themeScript, modern).not.toContain(modern);
    }
    expect(new TextEncoder().encode(themeScript).length).toBeLessThan(2048);
  });
});
