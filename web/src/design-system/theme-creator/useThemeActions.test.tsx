import { act, renderHook } from "@testing-library/react";
import { useMemo, useReducer, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readCustomThemes, saveCustomTheme, type StoredTheme } from "../../theme/custom-themes.ts";
import { draftFrom, draftReducer, emptySource, isDirty, type DraftStart } from "./model/draft.ts";
import { resolveTheme } from "./model/resolve.ts";
import type { ThemeSource } from "./model/types.ts";
import { themeVars } from "./model/vars.ts";
import { useThemeActions } from "./useThemeActions.ts";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-custom-theme");
  root.removeAttribute("style");
  vi.restoreAllMocks();
});

/** Passes every contrast pairing, so it saves without a warning. */
const green: ThemeSource = {
  base: "light",
  keys: { action: "#1e6b45" },
  overrides: { semantic: {}, component: {} },
};

function saveOcean(): StoredTheme {
  const resolved = resolveTheme(green);
  return saveCustomTheme({
    name: "Ocean",
    scheme: resolved.scheme,
    vars: themeVars(resolved, "diff"),
    source: green,
  });
}

const lightStart: DraftStart = {
  label: "Light",
  name: "",
  editing: null,
  source: emptySource("light"),
};

/** The hook over the real draft reducer, as ThemeCreator runs it. */
function renderActions(start: DraftStart = lightStart) {
  return renderHook(() => {
    const [draft, dispatch] = useReducer(draftReducer, start, draftFrom);
    const theme = useMemo(() => resolveTheme(draft.source), [draft.source]);
    const libraryHeadingRef = useRef<HTMLElement>(null);
    const actions = useThemeActions({
      draft,
      theme,
      deferredTheme: theme,
      dispatch,
      libraryHeadingRef,
    });
    return { draft, dispatch, actions };
  });
}

type Rendered = ReturnType<typeof renderActions>;

/** Gives the draft unsaved changes. */
function makeDirty({ result }: Rendered) {
  act(() => {
    result.current.dispatch({ type: "rename", name: "Mine" });
  });
  expect(isDirty(result.current.draft)).toBe(true);
}

describe("useThemeActions: card actions (theme-creator-controls R2.5, R2.7–R2.9)", () => {
  it("Edit loads the theme to edit in place", () => {
    const ocean = saveOcean();
    const rendered = renderActions();

    act(() => {
      rendered.result.current.actions.edit(ocean);
    });

    const { draft, actions } = rendered.result.current;
    expect(draft).toMatchObject({ name: "Ocean", editing: ocean.id, source: green });
    expect(actions.editing).toEqual(ocean);
    expect(actions.notice).toBe("Editing Ocean");
  });

  it("Edit confirms first while the draft has unsaved changes", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    makeDirty(rendered);

    act(() => {
      rendered.result.current.actions.edit(ocean);
    });

    const { draft, actions } = rendered.result.current;
    expect(actions.dialogs.dialog).toMatchObject({
      kind: "start",
      start: { label: "Ocean", editing: ocean.id },
    });
    expect(draft.name).toBe("Mine");
  });

  it("Duplicate starts a new, unsaved draft named “<name> copy”, from that theme", () => {
    const ocean = saveOcean();
    const rendered = renderActions();

    act(() => {
      rendered.result.current.actions.duplicate(ocean);
    });

    const { draft, actions } = rendered.result.current;
    expect(draft).toMatchObject({ name: "Ocean copy", editing: null, source: green });
    expect(draft.start.label).toBe("Ocean");
    expect(actions.editing).toBeUndefined();
    expect(readCustomThemes()).toEqual([ocean]);
  });

  it("Duplicate cuts the name to 30 characters", () => {
    const resolved = resolveTheme(green);
    const long = saveCustomTheme({
      name: "A".repeat(30),
      scheme: resolved.scheme,
      vars: themeVars(resolved, "diff"),
      source: green,
    });
    const rendered = renderActions();

    act(() => {
      rendered.result.current.actions.duplicate(long);
    });

    expect(rendered.result.current.draft.name).toBe(`${"A".repeat(25)} copy`);
  });

  it("Duplicate confirms first while the draft has unsaved changes", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    makeDirty(rendered);

    act(() => {
      rendered.result.current.actions.duplicate(ocean);
    });

    expect(rendered.result.current.actions.dialogs.dialog).toMatchObject({
      kind: "start",
      start: { label: "Ocean", name: "Ocean copy", editing: null },
    });
    expect(rendered.result.current.draft.name).toBe("Mine");
  });

  it("Use on site selects the saved theme site-wide and says so", () => {
    const ocean = saveOcean();
    const rendered = renderActions();

    act(() => {
      rendered.result.current.actions.applyOnSite(ocean);
    });

    expect(localStorage.getItem("theme")).toBe(`custom:${ocean.id}`);
    expect(root).toHaveAttribute("data-custom-theme", ocean.id);
    expect(rendered.result.current.actions.activeId).toBe(ocean.id);
    expect(rendered.result.current.actions.notice).toBe("Now using Ocean across the site");
  });

  it("Use on site applies the saved version, not the draft's unsaved changes", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    act(() => {
      rendered.result.current.actions.edit(ocean);
    });
    act(() => {
      rendered.result.current.dispatch({ type: "setKey", key: "action", value: "#94440a" });
    });

    act(() => {
      rendered.result.current.actions.applyOnSite(ocean);
    });

    expect(root.style.getPropertyValue("--color-action-background")).toBe("#1e6b45");
  });

  it("deleting the theme being edited leaves its values as a new, unsaved theme (R2.9)", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    act(() => {
      rendered.result.current.actions.edit(ocean);
    });

    act(() => {
      rendered.result.current.actions.dialogs.onDelete(ocean, null);
    });

    const { draft, actions } = rendered.result.current;
    expect(readCustomThemes()).toEqual([]);
    expect(actions.editing).toBeUndefined();
    expect(draft.source).toEqual(green);
    expect(actions.notice).toBe("Deleted Ocean");

    // Saving it again asks for its name, as a new theme does, then makes one with a new id.
    act(() => {
      rendered.result.current.actions.save();
    });
    const { dialog } = rendered.result.current.actions.dialogs;
    expect(dialog).toMatchObject({ kind: "name", asNew: false, save: { name: "Ocean" } });
    act(() => {
      if (dialog?.kind === "name") rendered.result.current.actions.dialogs.onSave(dialog.save);
    });
    const [saved] = readCustomThemes();
    expect(saved).toMatchObject({ name: "Ocean", source: green });
    expect(saved?.id).not.toBe(ocean.id);
  });
});

describe("useThemeActions: Save (theme-creator-controls R4.1, R4.4)", () => {
  it("asks a theme that isn't saved yet for its name, prefilled with the draft's", () => {
    const rendered = renderActions({ ...lightStart, name: "Mine", source: green });

    act(() => {
      rendered.result.current.actions.save();
    });

    expect(rendered.result.current.actions.dialogs.dialog).toEqual({
      kind: "name",
      asNew: false,
      save: { target: null, name: "Mine" },
    });
    expect(readCustomThemes()).toEqual([]);
  });

  it("saves the theme being edited in place, without asking", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    act(() => {
      rendered.result.current.actions.edit(ocean);
    });
    act(() => {
      rendered.result.current.dispatch({ type: "setKey", key: "action", value: "#94440a" });
    });

    act(() => {
      rendered.result.current.actions.save();
    });

    expect(rendered.result.current.actions.dialogs.dialog).toBeNull();
    expect(readCustomThemes()).toEqual([expect.objectContaining({ id: ocean.id, name: "Ocean" })]);
    expect(readCustomThemes()[0]?.vars["--color-action-background"]).toBe("#94440a");
  });

  it("Save as new asks for a name prefilled “<name> copy”, for a new theme", () => {
    const ocean = saveOcean();
    const rendered = renderActions();
    act(() => {
      rendered.result.current.actions.edit(ocean);
    });

    act(() => {
      rendered.result.current.actions.askSaveAsNew();
    });

    expect(rendered.result.current.actions.dialogs.dialog).toEqual({
      kind: "name",
      asNew: true,
      save: { target: null, name: "Ocean copy" },
    });
  });
});

describe("useThemeActions: export (R4.6)", () => {
  it("Copy CSS writes every custom property, then says “Copied CSS”", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const rendered = renderActions({ ...lightStart, source: green });

    await act(() => rendered.result.current.actions.copyCss());

    const css = writeText.mock.calls[0]?.[0] ?? "";
    expect(css.startsWith(":root {\n  color-scheme: light;\n")).toBe(true);
    for (const [name, value] of Object.entries(themeVars(resolveTheme(green), "full")))
      expect(css).toContain(`  ${name}: ${value};\n`);
    expect(rendered.result.current.actions.notice).toBe("Copied CSS");
  });

  it("says so when the clipboard refuses", async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const rendered = renderActions();

    await act(() => rendered.result.current.actions.copyCss());

    expect(rendered.result.current.actions.notice).toBe("Couldn’t copy CSS");
  });
});
