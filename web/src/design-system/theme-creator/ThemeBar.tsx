import { Fragment, useContext, useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "../../components/Button/Button.tsx";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { CopyButton } from "../../components/shared/CopyButton.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import {
  readCustomThemes,
  renameCustomTheme,
  saveCustomTheme,
  type StoredTheme,
} from "../../theme/custom-themes.ts";
import { customChoice, deleteTheme } from "../../theme/preference.ts";
import { useCustomThemes, useStorageAvailable } from "../../theme/useCustomThemes.ts";
import { useEffectiveTheme } from "../../theme/useEffectiveTheme.ts";
import { DraftDispatch } from "./context.ts";
import { failingPairings } from "./model/contrast.ts";
import {
  DTCG_MEDIA_TYPE,
  exportFileName,
  exportTheme,
  importTheme,
  MAX_IMPORT_BYTES,
} from "./model/dtcg.ts";
import { emptySource, isDirty, readSource, type Draft, type DraftStart } from "./model/draft.ts";
import { presets } from "./model/presets.ts";
import { validateSave } from "./model/save.ts";
import type { ResolvedTheme, ThemeSource } from "./model/types.ts";
import { themeVars } from "./model/vars.ts";
import { SaveDialogs, type BarDialog } from "./SaveDialogs.tsx";
import styles from "./ThemeCreator.module.css";

const builtInStarts: readonly DraftStart[] = [
  { label: "Light", name: "", editing: null, source: emptySource("light") },
  { label: "Dark", name: "", editing: null, source: emptySource("dark") },
];

/** A saved theme to edit in place (its id), or to start a new theme from (no id). */
function savedStart(theme: StoredTheme, edit: boolean): DraftStart | null {
  const source = readSource(theme.source);
  return (
    source && {
      label: theme.name,
      name: edit ? theme.name : "",
      editing: edit ? theme.id : null,
      source,
    }
  );
}

/** Every custom property as a CSS rule, for "Copy CSS" (R10.2). */
function cssText(theme: ResolvedTheme): string {
  const declarations = Object.entries(themeVars(theme, "full")).map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return `:root {\n  color-scheme: ${theme.scheme};\n${declarations.join("\n")}\n}\n`;
}

/** Downloads a file through an object URL, revoked straight after (R10.1). */
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
 * The draft's name and actions (theme-creator R2.7; design §8.3): start from, save, export,
 * import, discard and the saved themes, with a status line that isn't announced (R3.6).
 */
export function ThemeBar({
  draft,
  theme,
  deferredTheme,
  onEditToken,
}: {
  draft: Draft;
  theme: ResolvedTheme;
  /** For the contrast count, which may lag a fast drag (design §3.2). */
  deferredTheme: ResolvedTheme;
  onEditToken: (token: string) => void;
}) {
  const dispatch = useContext(DraftDispatch);
  const saved = useCustomThemes();
  const storage = useStorageAvailable();
  const [dialog, setDialog] = useState<BarDialog | null>(null);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState("");
  // Each failed attempt is a new alert, so the same errors are announced again.
  const [importErrors, setImportErrors] = useState<{
    errors: string[];
    more: number;
    attempt: number;
  } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = isDirty(draft);
  const issues = failingPairings(deferredTheme).length;
  const editing = saved.find(({ id }) => id === draft.editing);
  const choice = useEffectiveTheme();
  const activeId = saved.find(({ id }) => customChoice(id) === choice)?.id;

  // Shown and announced once, politely (R15.2). Emptied first, so a repeat is announced again.
  const say = (message: string) => {
    flushSync(() => {
      setNotice("");
    });
    setNotice(message);
  };

  function commit(id: string | null) {
    const stored = saveCustomTheme({
      ...(readCustomThemes().some((candidate) => candidate.id === id) && id !== null ? { id } : {}),
      name: draft.name.trim(),
      scheme: theme.scheme,
      vars: themeVars(theme, "diff"),
      source: draft.source,
    });
    dispatch({ type: "saved", id: stored.id, name: stored.name });
    // Saving never selects the theme, so the editor doesn't restyle itself (R3.4).
    say(`Saved ${stored.name}`);
  }

  /** Save's checks in order (R3.1), each reaching its own UI (design §8.7). */
  function save(id: string | null = draft.editing) {
    // Read now, not from this render: a delete may have just made room (R2.2).
    const check = validateSave({
      name: draft.name,
      editing: id,
      resolved: theme,
      saved: readCustomThemes(),
    });
    switch (check.kind) {
      case "name":
        setNameError(check.message);
        nameRef.current?.focus();
        return;
      case "limit":
        setDialog({ kind: "limit" });
        return;
      case "duplicate":
        say(`This theme looks just like ${check.of}. Change something before saving it.`);
        return;
      case "contrast":
        setDialog({ kind: "contrast", failures: check.failures, editing: id });
        return;
      case "ok":
        commit(id);
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

  function applyImport(name: string, source: ThemeSource, ignored: number) {
    dispatch({ type: "import", name, source });
    setImportErrors(null);
    say(
      ignored > 0
        ? `Imported ${name}. ${String(ignored)} tokens the editor doesn’t change were left as they are.`
        : `Imported ${name}.`,
    );
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared, so choosing the same file again still fires a change.
    input.value = "";
    if (!file) return;
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

  return (
    <div className={styles.bar}>
      <div className={styles.barRow}>
        <TextField
          ref={nameRef}
          label="Theme name"
          required
          className={styles.name}
          value={draft.name}
          error={nameError}
          onChange={(event) => {
            setNameError(undefined);
            dispatch({ type: "rename", name: event.target.value });
          }}
        />
        <div className={styles.barActions}>
          <Menu>
            <MenuTrigger iconEnd="chevron-down">Start from</MenuTrigger>
            <MenuPopup>
              {builtInStarts.map((option) => (
                <MenuItem
                  key={option.label}
                  onSelect={() => {
                    start(option);
                  }}
                >
                  {option.label}
                </MenuItem>
              ))}
              {saved.map((option) => {
                const from = savedStart(option, false);
                return (
                  from && (
                    <MenuItem
                      key={option.id}
                      icon="palette"
                      onSelect={() => {
                        start(from);
                      }}
                    >
                      {option.name}
                    </MenuItem>
                  )
                );
              })}
              <MenuSeparator />
              {presets.map((preset) => (
                <MenuItem
                  key={preset.id}
                  onSelect={() => {
                    start({ label: preset.name, name: "", editing: null, source: preset.source });
                  }}
                >
                  {preset.name}
                </MenuItem>
              ))}
            </MenuPopup>
          </Menu>
          <Button
            variant="primary"
            onClick={() => {
              save();
            }}
          >
            Save
          </Button>
          <Button
            iconStart="download"
            onClick={() => {
              download(
                exportFileName(draft.name),
                `${JSON.stringify(exportTheme(draft.name.trim() || "Untitled", draft.source, theme), null, 2)}\n`,
              );
            }}
          >
            Export
          </Button>
          <CopyButton text={cssText(theme)} label="Copy CSS" className={styles.copy} />
          <Button
            iconStart="upload"
            onClick={() => {
              fileRef.current?.click();
            }}
          >
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void readFile(event)}
          />
          <Button
            variant="ghost"
            iconStart="reset"
            disabled={!dirty}
            disabledReason="No changes to discard"
            onClick={() => {
              setDialog({ kind: "discard" });
            }}
          >
            Discard changes
          </Button>
          <Menu>
            <MenuTrigger
              iconEnd="chevron-down"
              disabled={saved.length === 0}
              disabledReason="No saved themes yet"
            >
              Saved themes ({saved.length})
            </MenuTrigger>
            <MenuPopup align="end">
              {saved.map((option) => (
                <Fragment key={option.id}>
                  <MenuItem
                    icon="palette"
                    onSelect={() => {
                      const from = savedStart(option, true);
                      if (from) start(from);
                    }}
                  >
                    Edit {option.name}
                  </MenuItem>
                  <MenuItem
                    onSelect={() => {
                      setDialog({ kind: "rename", theme: option });
                    }}
                  >
                    Rename {option.name}
                  </MenuItem>
                  <MenuItem
                    icon="trash"
                    onSelect={() => {
                      setDialog({ kind: "delete", theme: option, thenSave: false });
                    }}
                  >
                    Delete {option.name}
                  </MenuItem>
                </Fragment>
              ))}
            </MenuPopup>
          </Menu>
        </div>
      </div>
      <p className={styles.status}>
        {editing ? `Editing ${editing.name}` : `New theme from ${draft.start.label}`}
        {dirty && " · Unsaved changes"}
        {" · "}
        {issues === 0
          ? "All contrast pairings pass"
          : `${String(issues)} contrast ${issues === 1 ? "issue" : "issues"}`}
      </p>
      <Typography variant="small" tone="muted">
        Themes are saved in this browser. Export one to keep a copy.
      </Typography>
      {!storage && (
        <Typography variant="small" tone="warning">
          This browser isn’t allowing storage: saved themes last only while this page is open, and
          edits won’t survive a reload.
        </Typography>
      )}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      {importErrors && (
        <div key={importErrors.attempt} role="alert" className={styles.importErrors}>
          <p>The file couldn’t be imported:</p>
          <ul>
            {importErrors.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {importErrors.more > 0 && <p>and {importErrors.more} more.</p>}
        </div>
      )}
      <SaveDialogs
        dialog={dialog}
        saved={saved}
        activeId={activeId}
        onClose={(kind) => {
          setDialog((current) => (current?.kind === kind ? null : current));
        }}
        onShowDialog={setDialog}
        onSaveAnyway={commit}
        onEditToken={onEditToken}
        onOverwrite={(id) => {
          save(id);
        }}
        onRename={(id, name) => {
          renameCustomTheme(id, name);
          if (draft.editing === id) {
            dispatch(dirty ? { type: "rename", name } : { type: "saved", id, name });
          }
          say(`Renamed to ${name}`);
        }}
        onDelete={(target, thenSave) => {
          deleteTheme(target.id);
          say(`Deleted ${target.name}`);
          if (thenSave) save(draft.editing === target.id ? null : draft.editing);
        }}
        onDiscard={() => {
          dispatch({ type: "discard" });
          say("Changes discarded");
        }}
        onStart={begin}
        onImport={applyImport}
      />
    </div>
  );
}
