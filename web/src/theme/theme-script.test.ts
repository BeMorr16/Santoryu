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
  root.removeAttribute("data-js");
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
