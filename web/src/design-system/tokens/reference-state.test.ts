import { describe, expect, it } from "vitest";
import { rowGroups } from "./groups.ts";
import {
  initialReferenceState,
  referenceIndex,
  referenceReducer,
  type ReferenceAction,
  type ReferenceState,
} from "./reference-state.ts";
import { matchRows } from "./search.ts";

const run = (...actions: ReferenceAction[]): ReferenceState =>
  actions.reduce(referenceReducer, initialReferenceState);

describe("referenceReducer (ds-tokens §9.2)", () => {
  it("starts with no query and every group closed (R4.4)", () => {
    expect(initialReferenceState).toEqual({ query: "", openGroups: new Set() });
  });

  it("opens exactly the groups with matches when the query changes (R11.3, R11.6)", () => {
    const state = run({ type: "search", query: "muted" });
    const matches = matchRows(referenceIndex, "muted") ?? new Set<string>();

    expect(state.query).toBe("muted");
    expect(state.openGroups).toEqual(new Set([...matches].map((row) => rowGroups.get(row))));
    expect(state.openGroups.has("semantic-color")).toBe(true);
  });

  it("closes every group when the query empties (R11.5)", () => {
    const state = run(
      { type: "search", query: "muted" },
      { type: "toggle", group: "primitive-space", open: true },
      { type: "search", query: "" },
    );

    expect(state).toEqual({ query: "", openGroups: new Set() });
  });

  it("honors toggles between query changes, until the next change (R11.6)", () => {
    const toggled = run(
      { type: "search", query: "muted" },
      { type: "toggle", group: "semantic-color", open: false },
      { type: "toggle", group: "primitive-space", open: true },
    );
    expect(toggled.openGroups.has("semantic-color")).toBe(false);
    expect(toggled.openGroups.has("primitive-space")).toBe(true);

    const next = referenceReducer(toggled, { type: "search", query: "muted text" });
    expect(next.openGroups.has("semantic-color")).toBe(true);
    expect(next.openGroups.has("primitive-space")).toBe(false);
  });

  it("keeps the open set's identity when a new query opens the same groups", () => {
    const first = run({ type: "search", query: "mute" });
    const second = referenceReducer(first, { type: "search", query: "muted" });

    expect(second.openGroups).toBe(first.openGroups);
  });

  it("opens a revealed row's group, keeping the others (R7.1)", () => {
    const state = run(
      { type: "toggle", group: "primitive-space", open: true },
      { type: "reveal", row: "color-text-muted" },
    );

    expect(state.openGroups).toEqual(new Set(["primitive-space", "semantic-color"]));
  });

  it("clears a query that hides the revealed row, opening its group and keeping the open ones (R11.8)", () => {
    const searched = run({ type: "search", query: "radius" });
    const state = referenceReducer(searched, { type: "reveal", row: "color-text-muted" });

    expect(state.query).toBe("");
    expect(state.openGroups).toEqual(new Set([...searched.openGroups, "semantic-color"]));
  });

  it("keeps a query that already shows the revealed row", () => {
    const state = run(
      { type: "search", query: "muted" },
      { type: "reveal", row: "color-text-muted" },
    );

    expect(state.query).toBe("muted");
  });

  it("ignores a row that isn't a token, and an open group's row", () => {
    const open = run({ type: "reveal", row: "color-text-muted" });

    expect(referenceReducer(open, { type: "reveal", row: "naming" })).toBe(open);
    expect(referenceReducer(open, { type: "reveal", row: "color-text-default" })).toBe(open);
  });
});
