import { useState, type Dispatch, type RefObject } from "react";
import { flushSync } from "react-dom";
import {
  readCustomThemes,
  renameCustomTheme,
  saveCustomTheme,
  type StoredTheme,
} from "../../theme/custom-themes.ts";
import { customChoice, deleteTheme, writePreference } from "../../theme/preference.ts";
import { useCustomThemes } from "../../theme/useCustomThemes.ts";
import { useEffectiveTheme } from "../../theme/useEffectiveTheme.ts";
import { failingPairings } from "./model/contrast.ts";
import {
  DTCG_MEDIA_TYPE,
  exportFileName,
  exportTheme,
  importTheme,
  MAX_IMPORT_BYTES,
} from "./model/dtcg.ts";
import {
  isDirty,
  readSource,
  type Draft,
  type DraftAction,
  type DraftStart,
} from "./model/draft.ts";
import { copyName } from "./model/library.ts";
import { validateSave } from "./model/save.ts";
import type { ResolvedTheme, ThemeSource } from "./model/types.ts";
import { themeVars } from "./model/vars.ts";
import type { BarDialog, PendingSave, SaveDialogsProps } from "./SaveDialogs.tsx";

/** A failed import's problems. Each attempt is a new alert, so the same errors are announced again. */
export interface ImportErrors {
  errors: string[];
  more: number;
  attempt: number;
}

/** What the library, the draft toolbar and the narrow Preview bar share (theme-creator-controls design §3). */
export interface ThemeActions {
  /** The saved custom themes, in creation order. */
  saved: readonly StoredTheme[];
  /** The custom theme the site is using, if any. */
  activeId: string | undefined;
  /** The saved theme the draft edits in place, while it still exists. */
  editing: StoredTheme | undefined;
  dirty: boolean;
  /** Failing contrast pairings, from the deferred theme (theme-creator R3.6). */
  issues: number;
  /** The polite status line's text (R6.3). */
  notice: string;
  importErrors: ImportErrors | null;
  /**
   * R4.4: saves the theme being edited, with theme-creator R3's checks in order. A theme that
   * isn't saved yet asks for its name first, in a dialog.
   */
  save: () => void;
  /** R3.2: confirms first while the draft has unsaved changes. */
  start: (start: DraftStart) => void;
  /** R2.5: edits the theme in place. */
  edit: (theme: StoredTheme) => void;
  /** R2.8: a new, unsaved draft named "<name> copy". */
  duplicate: (theme: StoredTheme) => void;
  /** R2.7: selects the saved theme site-wide. */
  applyOnSite: (theme: StoredTheme) => void;
  /** R3.3: reads a chosen file, then imports it or lists its problems. */
  importFile: (file: File) => Promise<void>;
  /** R4.6: downloads the draft as a tokens file. */
  downloadFile: () => void;
  /** R4.6: copies the draft's custom properties as CSS, then says how it went. */
  copyCss: () => Promise<void>;
  askDiscard: () => void;
  askRename: (theme: StoredTheme) => void;
  askDelete: (theme: StoredTheme) => void;
  askSaveAsNew: () => void;
  /** Everything `SaveDialogs` takes but the editor's own `onEditToken`. */
  dialogs: Omit<SaveDialogsProps, "onEditToken">;
}

/** A saved theme to edit in place (its id), or a copy of it to start a new theme from. */
function savedStart(theme: StoredTheme, edit: boolean): DraftStart | null {
  const source = readSource(theme.source);
  return (
    source && {
      label: theme.name,
      name: edit ? theme.name : copyName(theme.name),
      editing: edit ? theme.id : null,
      source,
    }
  );
}

/** Every custom property as a CSS rule, for "Copy CSS" (theme-creator R10.2). */
function cssText(theme: ResolvedTheme): string {
  const declarations = Object.entries(themeVars(theme, "full")).map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return `:root {\n  color-scheme: ${theme.scheme};\n${declarations.join("\n")}\n}\n`;
}

/** Downloads a file through an object URL, revoked straight after (theme-creator R10.1). */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: DTCG_MEDIA_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  // Attached while clicked, and revoked a moment later: some engines cancel a download otherwise.
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * The theme creator's actions on the draft and the saved themes (theme-creator-controls design
 * §3): save and its dialogs, starting points, import and export, and one polite notice.
 */
export function useThemeActions({
  draft,
  theme,
  deferredTheme,
  dispatch,
  libraryHeadingRef,
}: {
  draft: Draft;
  theme: ResolvedTheme;
  /** For the contrast count, which may lag a fast drag (theme-creator design §3.2). */
  deferredTheme: ResolvedTheme;
  dispatch: Dispatch<DraftAction>;
  /** Where focus goes when a dialog's opener is gone, such as a deleted theme's card menu. */
  libraryHeadingRef: RefObject<HTMLElement | null>;
}): ThemeActions {
  const saved = useCustomThemes();
  const [dialog, setDialog] = useState<BarDialog | null>(null);
  const [notice, setNotice] = useState("");
  const [importErrors, setImportErrors] = useState<ImportErrors | null>(null);
  const dirty = isDirty(draft);
  const choice = useEffectiveTheme();
  const activeId = saved.find(({ id }) => customChoice(id) === choice)?.id;
  const editing = saved.find(({ id }) => id === draft.editing);

  // Shown and announced once, politely (theme-creator R15.2). Emptied first, so a repeat is
  // announced again.
  const say = (message: string) => {
    flushSync(() => {
      setNotice("");
    });
    setNotice(message);
  };

  function commit({ target, name }: PendingSave) {
    const stored = saveCustomTheme({
      ...(target !== null && readCustomThemes().some(({ id }) => id === target)
        ? { id: target }
        : {}),
      name: name.trim(),
      scheme: theme.scheme,
      vars: themeVars(theme, "diff"),
      source: draft.source,
    });
    dispatch({ type: "saved", id: stored.id, name: stored.name });
    // Saving never selects the theme, so the editor doesn't restyle itself (theme-creator R3.4).
    say(`Saved ${stored.name}`);
  }

  /** Save's checks in order (theme-creator R3.1), each reaching its own UI (design §8.7). */
  function trySave(pending: PendingSave) {
    // Read now, not from this render: a delete may have just made room (theme-creator R2.2).
    const check = validateSave({
      name: pending.name,
      editing: pending.target,
      resolved: theme,
      saved: readCustomThemes(),
    });
    switch (check.kind) {
      case "name":
        // The name dialog checks first, so only a change since then (another tab) gets here.
        setDialog({ kind: "name", save: pending, asNew: false, error: check.message });
        return;
      case "limit":
        setDialog({ kind: "limit", save: pending });
        return;
      case "duplicate":
        say(`This theme looks just like ${check.of}. Change something before saving it.`);
        return;
      case "contrast":
        setDialog({ kind: "contrast", failures: check.failures, save: pending });
        return;
      case "ok":
        commit(pending);
    }
  }

  /** Replaces the draft, saying so: the status line isn't announced. */
  function begin(next: DraftStart) {
    dispatch({ type: "start", start: next });
    say(next.editing === null ? `Started from ${next.label}` : `Editing ${next.label}`);
  }

  function start(next: DraftStart) {
    if (dirty) setDialog({ kind: "start", start: next });
    else begin(next);
  }

  function startFrom(chosen: StoredTheme, edit: boolean) {
    const from = savedStart(chosen, edit);
    if (from) start(from);
  }

  function applyImport(name: string, source: ThemeSource, ignored: number) {
    dispatch({ type: "import", name, source });
    setImportErrors(null);
    say(
      ignored > 0
        ? `Imported ${name}. ${String(ignored)} tokens the editor doesn’t change were left as they are.`
        : `Imported ${name}.`,
    );
  }

  async function importFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      setImportErrors({ errors: ["The file is larger than 1 MB."], more: 0, attempt: Date.now() });
      return;
    }
    const result = importTheme(
      await file.text(),
      file.name.replace(/\.tokens\.json$|\.json$/i, ""),
    );
    if (!result.ok) {
      setImportErrors({ errors: result.errors, more: result.more, attempt: Date.now() });
      return;
    }
    setImportErrors(null);
    if (dirty)
      setDialog({
        kind: "import",
        name: result.name,
        source: result.source,
        ignored: result.ignored,
      });
    else applyImport(result.name, result.source, result.ignored);
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(cssText(theme));
      say("Copied CSS");
    } catch {
      say("Couldn’t copy CSS");
    }
  }

  return {
    saved,
    activeId,
    editing,
    dirty,
    issues: failingPairings(deferredTheme).length,
    notice,
    importErrors,
    save: () => {
      const pending = { target: draft.editing, name: draft.name };
      if (editing) trySave(pending);
      else setDialog({ kind: "name", save: pending, asNew: false });
    },
    start,
    edit: (chosen) => {
      startFrom(chosen, true);
    },
    duplicate: (chosen) => {
      startFrom(chosen, false);
    },
    applyOnSite: (chosen) => {
      writePreference(customChoice(chosen.id));
      say(`Now using ${chosen.name} across the site`);
    },
    importFile,
    downloadFile: () => {
      download(
        exportFileName(draft.name),
        `${JSON.stringify(exportTheme(draft.name.trim() || "Untitled", draft.source, theme), null, 2)}\n`,
      );
    },
    copyCss,
    askDiscard: () => {
      setDialog({ kind: "discard" });
    },
    askRename: (chosen) => {
      setDialog({ kind: "rename", theme: chosen });
    },
    askDelete: (chosen) => {
      setDialog({ kind: "delete", theme: chosen, then: null });
    },
    askSaveAsNew: () => {
      setDialog({
        kind: "name",
        save: { target: null, name: copyName(draft.name) },
        asNew: true,
      });
    },
    dialogs: {
      dialog,
      saved,
      activeId,
      onClose: (kind) => {
        setDialog((current) => (current?.kind === kind ? null : current));
        // The dialog has returned focus to its opener if it could. A deleted theme's card took
        // its menu button with it, so focus would be lost to the page (WCAG 2.4.3).
        const active = document.activeElement;
        if (
          active === null ||
          active === document.body ||
          active.closest("dialog:not([open])") !== null
        )
          libraryHeadingRef.current?.focus();
      },
      onShowDialog: setDialog,
      onSave: trySave,
      onSaveAnyway: commit,
      onRename: (id, name) => {
        renameCustomTheme(id, name);
        if (draft.editing === id) {
          dispatch(dirty ? { type: "rename", name } : { type: "saved", id, name });
        }
        say(`Renamed to ${name}`);
      },
      onDelete: (target, then) => {
        deleteTheme(target.id);
        say(`Deleted ${target.name}`);
        if (then) trySave({ ...then, target: then.target === target.id ? null : then.target });
      },
      onDiscard: () => {
        dispatch({ type: "discard" });
        say("Changes discarded");
      },
      onStart: begin,
      onImport: applyImport,
    },
  };
}
