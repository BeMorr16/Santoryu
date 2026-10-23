// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_KEY,
  draftFrom,
  draftReducer,
  emptySource,
  isDirty,
  readDraft,
  readSource,
  startKeys,
  startLabel,
  storeDraft,
  type Draft,
  type DraftStart,
} from "./draft.ts";
import type { ThemeSource } from "./types.ts";

const lightStart: DraftStart = {
  label: "Light",
  name: "",
  editing: null,
  source: emptySource("light"),
};
const fresh = () => draftFrom(lightStart);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("draftReducer (theme-creator R11; design §8.2)", () => {
  it("starts from a starting point", () => {
    const start: DraftStart = {
      label: "Ocean",
      name: "Ocean",
      editing: "ocean123",
      source: { ...emptySource("dark"), keys: { radius: 8 } },
    };

    const draft = draftReducer(fresh(), { type: "start", start });

    expect(draft).toEqual({ name: "Ocean", editing: "ocean123", start, source: start.source });
    expect(isDirty(draft)).toBe(false);
  });

  it("sets a key, storing only values that differ from the base", () => {
    let draft = draftReducer(fresh(), { type: "setKey", key: "action", value: "#2a8556" });
    expect(draft.source.keys).toEqual({ action: "#2a8556" });
    expect(isDirty(draft)).toBe(true);

    draft = draftReducer(draft, { type: "setKey", key: "action", value: "#185480" });
    expect(draft.source.keys).toEqual({});
    expect(isDirty(draft)).toBe(false);
  });

  it("resets a key to the starting point's value (R5.8)", () => {
    const start = { ...lightStart, source: { ...emptySource("light"), keys: { radius: 8 } } };
    let draft = draftFrom(start);
    draft = draftReducer(draft, { type: "setKey", key: "radius", value: 16 });
    draft = draftReducer(draft, { type: "setKey", key: "density", value: 0.3 });

    draft = draftReducer(draft, { type: "resetKey", key: "radius" });
    draft = draftReducer(draft, { type: "resetKey", key: "density" });

    expect(draft.source.keys).toEqual({ radius: 8 });
  });

  it("sets and resets a semantic override (R6.3)", () => {
    const value = { kind: "color", hex: "#123456" } as const;
    let draft = draftReducer(fresh(), { type: "setSemantic", token: "color.text.default", value });
    expect(draft.source.overrides.semantic).toEqual({ "color.text.default": value });

    draft = draftReducer(draft, { type: "resetSemantic", token: "color.text.default" });
    expect(draft.source.overrides.semantic).toEqual({});
  });

  it("re-points a component token, and pointing it back to its own alias removes the override", () => {
    const token = "component.button.primary.background";
    let draft = draftReducer(fresh(), {
      type: "setComponent",
      token,
      target: "color.accent.border",
    });
    expect(draft.source.overrides.component).toEqual({ [token]: "color.accent.border" });

    draft = draftReducer(draft, { type: "setComponent", token, target: "color.action.background" });
    expect(draft.source.overrides.component).toEqual({});

    draft = draftReducer(draft, { type: "setComponent", token, target: "color.accent.border" });
    draft = draftReducer(draft, { type: "resetComponent", token });
    expect(draft.source.overrides.component).toEqual({});
  });

  it("renames", () => {
    const draft = draftReducer(fresh(), { type: "rename", name: "Harbor" });

    expect(draft.name).toBe("Harbor");
    expect(isDirty(draft)).toBe(true);
  });

  it("loads an import unsaved, as a new theme on top of the starting point (R10.3)", () => {
    const editing = draftFrom({
      ...lightStart,
      name: "Ocean",
      label: "Ocean",
      editing: "ocean123",
    });
    const source: ThemeSource = { ...emptySource("dark"), keys: { density: 0.2 } };

    const draft = draftReducer(editing, { type: "import", name: "Imported", source });

    expect(draft).toMatchObject({ name: "Imported", editing: null, source });
    expect(draft.start).toBe(editing.start);
    expect(isDirty(draft)).toBe(true);
  });

  it("resets keys to an imported base's own values when the import changed the base (R5.8)", () => {
    let draft = draftFrom({
      ...lightStart,
      source: { ...emptySource("light"), keys: { radius: 8 } },
    });
    draft = draftReducer(draft, {
      type: "import",
      name: "Night",
      source: { ...emptySource("dark"), keys: { radius: 2, density: 0.2 } },
    });

    expect(startKeys(draft).radius).toBe(4);
    expect(startLabel(draft)).toBe("Dark");
    draft = draftReducer(draft, { type: "resetKey", key: "radius" });
    expect(draft.source.keys).toEqual({ density: 0.2 });
  });

  it("labels base values by the starting point while the base is unchanged", () => {
    const draft = draftFrom({ ...lightStart, label: "Soft" });

    expect(startLabel(draft)).toBe("Soft");
    expect(startKeys(draft).radius).toBe(4);
  });

  it("discards back to the starting point, or the saved version being edited (R11.2)", () => {
    const start = { ...lightStart, name: "Ocean", label: "Ocean", editing: "ocean123" };
    let draft = draftFrom(start);
    draft = draftReducer(draft, { type: "setKey", key: "radius", value: 16 });
    draft = draftReducer(draft, { type: "rename", name: "Other" });

    expect(draftReducer(draft, { type: "discard" })).toEqual(draftFrom(start));
  });

  it("after a save, edits the saved theme with no unsaved changes", () => {
    let draft = draftReducer(fresh(), { type: "setKey", key: "radius", value: 16 });
    draft = draftReducer(draft, { type: "rename", name: "Rounded" });

    draft = draftReducer(draft, { type: "saved", id: "round123", name: "Rounded" });

    expect(draft).toMatchObject({ name: "Rounded", editing: "round123" });
    expect(draft.start).toMatchObject({ label: "Rounded", name: "Rounded", editing: "round123" });
    expect(isDirty(draft)).toBe(false);
    expect(draftReducer(draft, { type: "discard" }).source.keys).toEqual({ radius: 16 });
  });
});

describe("draft storage (R11.1, R11.3; design §10)", () => {
  const changed = (): Draft => draftReducer(fresh(), { type: "setKey", key: "radius", value: 12 });

  it("stores a changed draft and restores it", () => {
    expect(storeDraft(changed())).toBe(true);

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "")).toEqual({ v: 1, draft: changed() });
    expect(readDraft()).toEqual(changed());
  });

  it("removes an unchanged draft instead of storing it", () => {
    storeDraft(changed());

    storeDraft(fresh());

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(readDraft()).toBeNull();
  });

  const json = (data: unknown) => JSON.stringify(data);

  it.each([
    ["non-JSON", "{nope"],
    ["a newer version", json({ v: 2, draft: changed() })],
    ["no draft", json({ v: 1 })],
    [
      "a bad base",
      json({
        v: 1,
        draft: { ...changed(), source: { ...emptySource("light"), base: "sepia" } },
      }),
    ],
    [
      "a bad key",
      json({
        v: 1,
        draft: { ...changed(), source: { ...emptySource("light"), keys: { radius: 99 } } },
      }),
    ],
    [
      "an unknown key",
      json({
        v: 1,
        draft: { ...changed(), source: { ...emptySource("light"), keys: { glow: 1 } } },
      }),
    ],
    [
      "a bad override",
      json({
        v: 1,
        draft: {
          ...changed(),
          source: {
            ...emptySource("light"),
            overrides: {
              semantic: { "space.inset.md": { kind: "dimension", value: 99, unit: "rem" } },
              component: {},
            },
          },
        },
      }),
    ],
    [
      "a bad re-point",
      json({
        v: 1,
        draft: {
          ...changed(),
          source: {
            ...emptySource("light"),
            overrides: {
              semantic: {},
              component: { "component.button.gap": "color.text.default" },
            },
          },
        },
      }),
    ],
    ["a bad start", json({ v: 1, draft: { ...changed(), start: { label: 1 } } })],
    ["a bad name", json({ v: 1, draft: { ...changed(), name: 7 } })],
  ])("restores nothing from %s", (_label, raw) => {
    localStorage.setItem(DRAFT_KEY, raw);

    expect(readDraft()).toBeNull();
  });

  it("reports that storage refused, without throwing (R11.3)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });

    expect(storeDraft(changed())).toBe(false);
  });

  it("reads nothing, without throwing, when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });

    expect(readDraft()).toBeNull();
  });
});

describe("readSource", () => {
  it("reads a valid source, with typed overrides and a swatch ref", () => {
    const source: ThemeSource = {
      base: "dark",
      keys: { action: "#2a8556", headingFont: "inter", density: 0.2 },
      overrides: {
        semantic: {
          "color.text.default": { kind: "color", hex: "#ffffff", ref: "color.gray.0" },
          "type.tracking.label": { kind: "number", value: 0.2 },
          "type.family.body": { kind: "font", font: "fira-code" },
          "type.measure.text": { kind: "dimension", value: 70, unit: "ch" },
        },
        component: { "component.button.primary.background": "color.accent.border" },
      },
    };

    expect(readSource(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it.each([
    null,
    { base: "light" },
    { base: "light", keys: { action: "#ABCDEF" }, overrides: { semantic: {}, component: {} } },
    {
      base: "light",
      keys: {},
      overrides: {
        semantic: { "color.text.default": { kind: "color", hex: "red" } },
        component: {},
      },
    },
  ])("rejects %j", (value) => {
    expect(readSource(value)).toBeNull();
  });
});
