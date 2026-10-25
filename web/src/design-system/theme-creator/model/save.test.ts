import { describe, expect, it } from "vitest";
import type { StoredTheme } from "../../../theme/custom-themes.ts";
import { resolveTheme } from "./resolve.ts";
import { nameProblem, validateSave } from "./save.ts";
import type { ThemeSource } from "./types.ts";
import { themeVars } from "./vars.ts";

const source = (
  keys: ThemeSource["keys"] = {},
  semantic: ThemeSource["overrides"]["semantic"] = {},
): ThemeSource => ({
  base: "light",
  keys,
  overrides: { semantic, component: {} },
});

const green = source({ action: "#1e6b45" });

function stored(id: string, name: string, from: ThemeSource): StoredTheme {
  const resolved = resolveTheme(from);
  return { id, name, scheme: resolved.scheme, vars: themeVars(resolved, "diff"), source: from };
}

const check = (
  name: string,
  from: ThemeSource,
  saved: StoredTheme[] = [],
  editing: string | null = null,
) => validateSave({ name, editing, resolved: resolveTheme(from), saved });

describe("validateSave (theme-creator R2.6, R3.1–R3.3)", () => {
  it.each([
    ["", "Enter a name for the theme."],
    ["   ", "Enter a name for the theme."],
    ["x".repeat(31), "Use 30 characters or fewer."],
    ["Light", "Light is a built-in theme. Choose another name."],
    [" dark ", "dark is a built-in theme. Choose another name."],
    ["OCEAN", "You already have a theme named Ocean."],
  ])("rejects the name %j", (name, message) => {
    expect(
      check(name, green, [stored("ocean123", "Ocean", source({ action: "#b25a12" }))]),
    ).toEqual({
      kind: "name",
      message,
    });
  });

  it("accepts 30 characters, trimmed", () => {
    expect(nameProblem(` ${"x".repeat(30)} `, [], null)).toBeUndefined();
  });

  it("lets a theme keep its own name when re-saved", () => {
    expect(nameProblem("ocean", [{ id: "ocean123", name: "Ocean" }], "ocean123")).toBeUndefined();
  });

  it("refuses a 4th theme, but not a re-save of one of the 3 (R2.2)", () => {
    const saved = [
      stored("aaaaaaaa", "One", source({ action: "#b25a12" })),
      stored("bbbbbbbb", "Two", source({ action: "#c8372c" })),
      stored("cccccccc", "Three", source({ action: "#4a3290" })),
    ];

    expect(check("Four", green, saved)).toEqual({ kind: "limit" });
    expect(check("One", green, saved, "aaaaaaaa")).toEqual({ kind: "ok" });
  });

  it.each([
    ["Light", source()],
    ["Dark", { ...source(), base: "dark" as const }],
  ])("refuses a duplicate of %s", (of, from) => {
    expect(check("Mine", from)).toEqual({ kind: "duplicate", of });
  });

  it("refuses a duplicate of a saved theme, naming it, but not of the theme being edited", () => {
    const saved = [stored("ocean123", "Ocean", green)];

    expect(check("Mine", green, saved)).toEqual({ kind: "duplicate", of: "Ocean" });
    expect(check("Ocean", green, saved, "ocean123")).toEqual({ kind: "ok" });
  });

  it("lists failing contrast pairings last", () => {
    const failing = source({}, { "color.text.subtle": { kind: "color", hex: "#c5d3e0" } });

    const result = check("Faint", failing);

    expect(result.kind).toBe("contrast");
    if (result.kind === "contrast") {
      expect(result.failures[0]).toMatchObject({
        token: "color.text.subtle",
        against: "color.surface.base",
        min: "text",
      });
    }
  });

  it("checks name, then limit, then duplicate, then contrast", () => {
    const failing = source({}, { "color.text.subtle": { kind: "color", hex: "#c5d3e0" } });
    const full = [
      stored("aaaaaaaa", "One", source({ action: "#b25a12" })),
      stored("bbbbbbbb", "Two", source({ action: "#c8372c" })),
      stored("cccccccc", "Three", failing),
    ];

    expect(check("", failing, full).kind).toBe("name");
    expect(check("Four", failing, full).kind).toBe("limit");
    expect(check("Mine", failing, full.slice(1)).kind).toBe("duplicate");
    expect(check("Mine", failing, full.slice(0, 2)).kind).toBe("contrast");
  });
});
