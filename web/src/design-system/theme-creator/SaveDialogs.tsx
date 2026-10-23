import { useId, useRef, useState } from "react";
import { Button } from "../../components/Button/Button.tsx";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogButton,
} from "../../components/Dialog/Dialog.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import type { StoredTheme } from "../../theme/custom-themes.ts";
import { minimumRatio, type PairingResult } from "../../tokens/contrast.ts";
import type { DraftStart } from "./model/draft.ts";
import { nameProblem } from "./model/save.ts";
import type { ThemeSource } from "./model/types.ts";
import styles from "./ThemeCreator.module.css";

/** The theme bar's dialogs (theme-creator R2.2, R2.4, R2.9, R3.3, R11.2; design §8.3, §8.7). */
export type BarDialog =
  | { kind: "contrast"; failures: readonly PairingResult[]; editing: string | null }
  | { kind: "limit" }
  | { kind: "rename"; theme: StoredTheme }
  | { kind: "delete"; theme: StoredTheme; thenSave: boolean }
  | { kind: "discard" }
  | { kind: "start"; start: DraftStart }
  | { kind: "import"; name: string; source: ThemeSource; ignored: number };

/** "2.31" for a measured ratio, "4.5" for a minimum. */
const ratioText = (ratio: number) => String(Math.floor(ratio * 100) / 100);

/** Failing pairings by foreground token, in order: one Edit per token. */
function byToken(failures: readonly PairingResult[]) {
  const groups = new Map<string, PairingResult[]>();
  for (const failure of failures) {
    groups.set(failure.token, [...(groups.get(failure.token) ?? []), failure]);
  }
  return [...groups];
}

/** A yes-or-no question that interrupts: the least destructive answer takes focus (APG). */
function ConfirmDialog({
  open,
  title,
  message,
  confirm,
  cancel = "Keep editing",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirm: string;
  cancel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      title={title}
      initialFocus={cancelRef}
      onComplete={(result) => {
        if (result === "success") onConfirm();
      }}
    >
      <DialogBody>
        <p>{message}</p>
      </DialogBody>
      <DialogActions>
        <DialogButton ref={cancelRef} result="failure">
          {cancel}
        </DialogButton>
        <DialogButton variant="primary" result="success">
          {confirm}
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}

/** The contrast warning on Save (R3.3): each failing pairing, with a way to its token. */
function ContrastDialog({
  failures,
  open,
  onSaveAnyway,
  onEditToken,
  onClose,
}: {
  failures: readonly PairingResult[];
  open: boolean;
  onSaveAnyway: () => void;
  onEditToken: (token: string) => void;
  onClose: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const introId = useId();
  const count = failures.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      title={count === 1 ? "1 contrast issue" : `${String(count)} contrast issues`}
      titleIcon="warning"
      initialFocus={keepRef}
      // Described by the summary only, not every pairing in the list.
      aria-describedby={introId}
      onComplete={(result) => {
        if (result === "success") onSaveAnyway();
      }}
    >
      <DialogBody>
        <p id={introId}>
          These pairings are below the WCAG AA minimum, so some text or controls may be hard to see.
          Edit a token, or save the theme as it is.
        </p>
        <ul className={styles.failures}>
          {byToken(failures).map(([token, pairings]) => (
            <li key={token}>
              <span>
                <code>{token}</code>
                {pairings.map(({ against, ratio, min }) => (
                  <span key={against} className={styles.pairing}>
                    on <code>{against}</code>: {ratioText(ratio)}:1, needs{" "}
                    {String(minimumRatio[min])}:1
                  </span>
                ))}
              </span>
              <DialogButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  onEditToken(token);
                }}
              >
                Edit <VisuallyHidden>{token}</VisuallyHidden>
              </DialogButton>
            </li>
          ))}
        </ul>
      </DialogBody>
      <DialogActions>
        <DialogButton result="success">Save anyway</DialogButton>
        <DialogButton ref={keepRef} variant="primary" result="failure">
          Keep editing
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}

/** At the limit (R2.2): overwrite a saved theme with this one, or delete one first. */
function LimitDialog({
  open,
  saved,
  onOverwrite,
  onDelete,
  onClose,
}: {
  open: boolean;
  saved: readonly StoredTheme[];
  onOverwrite: (id: string) => void;
  onDelete: (theme: StoredTheme) => void;
  onClose: () => void;
}) {
  // Every other action here replaces or deletes a theme (APG: least destructive first).
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`You have ${String(saved.length)} saved themes`}
      initialFocus={cancelRef}
    >
      <DialogBody>
        <p>
          Light and Dark, plus three of your own, is the most this site keeps. Overwrite one with
          this theme, or delete one to make room.
        </p>
        <ul className={styles.savedList}>
          {saved.map((theme) => (
            <li key={theme.id}>
              <span>{theme.name}</span>
              <DialogButton
                size="sm"
                onClick={() => {
                  onOverwrite(theme.id);
                }}
              >
                Overwrite <VisuallyHidden>{theme.name}</VisuallyHidden>
              </DialogButton>
              <DialogButton
                size="sm"
                variant="ghost"
                iconStart="trash"
                onClick={() => {
                  onDelete(theme);
                }}
              >
                Delete <VisuallyHidden>{theme.name}</VisuallyHidden>
              </DialogButton>
            </li>
          ))}
        </ul>
      </DialogBody>
      <DialogActions>
        <DialogButton ref={cancelRef}>Cancel</DialogButton>
      </DialogActions>
    </Dialog>
  );
}

/** Its own name state, reset for each theme by a key. */
function RenameForm({
  theme,
  saved,
  onRename,
  onDone,
}: {
  theme: StoredTheme;
  saved: readonly StoredTheme[];
  onRename: (id: string, name: string) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(theme.name);
  const [error, setError] = useState<string | undefined>(undefined);
  const field = useRef<HTMLInputElement>(null);
  return (
    <form
      noValidate
      className={styles.renameForm}
      onSubmit={(event) => {
        event.preventDefault();
        const problem = nameProblem(name, saved, theme.id);
        if (problem !== undefined) {
          setError(problem);
          field.current?.focus();
          return;
        }
        onRename(theme.id, name.trim());
        onDone();
      }}
    >
      <TextField
        ref={field}
        label="Theme name"
        required
        value={name}
        error={error}
        onChange={(event) => {
          setName(event.target.value);
          setError(undefined);
        }}
      />
      <DialogActions>
        <DialogButton>Cancel</DialogButton>
        <Button type="submit" variant="primary">
          Rename
        </Button>
      </DialogActions>
    </form>
  );
}

export function SaveDialogs({
  dialog,
  saved,
  activeId,
  onClose,
  onSaveAnyway,
  onEditToken,
  onOverwrite,
  onRename,
  onDelete,
  onDiscard,
  onStart,
  onImport,
  onShowDialog,
}: {
  dialog: BarDialog | null;
  saved: readonly StoredTheme[];
  /** The custom theme the site is using, if any. */
  activeId: string | undefined;
  /** Closes this kind of dialog, if it's still the one open: another may have replaced it. */
  onClose: (kind: BarDialog["kind"]) => void;
  onSaveAnyway: (editing: string | null) => void;
  onEditToken: (token: string) => void;
  onOverwrite: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (theme: StoredTheme, thenSave: boolean) => void;
  onDiscard: () => void;
  onStart: (start: DraftStart) => void;
  onImport: (name: string, source: ThemeSource, ignored: number) => void;
  onShowDialog: (dialog: BarDialog) => void;
}) {
  const kind = dialog?.kind;
  return (
    <>
      <ContrastDialog
        open={kind === "contrast"}
        failures={dialog?.kind === "contrast" ? dialog.failures : []}
        onSaveAnyway={() => {
          if (dialog?.kind === "contrast") onSaveAnyway(dialog.editing);
        }}
        onEditToken={onEditToken}
        onClose={() => {
          onClose("contrast");
        }}
      />
      <LimitDialog
        open={kind === "limit"}
        saved={saved}
        onOverwrite={onOverwrite}
        onDelete={(theme) => {
          onShowDialog({ kind: "delete", theme, thenSave: true });
        }}
        onClose={() => {
          onClose("limit");
        }}
      />
      <Dialog
        open={kind === "rename"}
        onClose={() => {
          onClose("rename");
        }}
        title="Rename theme"
      >
        {dialog?.kind === "rename" && (
          <RenameForm
            key={dialog.theme.id}
            theme={dialog.theme}
            saved={saved}
            onRename={onRename}
            onDone={() => {
              onClose("rename");
            }}
          />
        )}
      </Dialog>
      <ConfirmDialog
        open={kind === "delete"}
        title={dialog?.kind === "delete" ? `Delete “${dialog.theme.name}”?` : "Delete theme?"}
        message={
          dialog?.kind === "delete" && dialog.theme.id === activeId
            ? `It’s removed from this browser, and the site switches to ${dialog.theme.scheme === "dark" ? "Dark" : "Light"}. This can’t be undone.`
            : "It’s removed from this browser. This can’t be undone."
        }
        confirm="Delete"
        cancel="Cancel"
        onConfirm={() => {
          if (dialog?.kind === "delete") onDelete(dialog.theme, dialog.thenSave);
        }}
        onClose={() => {
          onClose("delete");
        }}
      />
      <ConfirmDialog
        open={kind === "discard"}
        title="Discard changes?"
        message="Your theme goes back to where you started, and the changes since are lost."
        confirm="Discard"
        onConfirm={onDiscard}
        onClose={() => {
          onClose("discard");
        }}
      />
      <ConfirmDialog
        open={kind === "start"}
        title={dialog?.kind === "start" ? `Start from ${dialog.start.label}?` : "Start over?"}
        message="Your unsaved changes will be lost."
        confirm="Start over"
        onConfirm={() => {
          if (dialog?.kind === "start") onStart(dialog.start);
        }}
        onClose={() => {
          onClose("start");
        }}
      />
      <ConfirmDialog
        open={kind === "import"}
        title={dialog?.kind === "import" ? `Import “${dialog.name}”?` : "Import theme?"}
        message="It replaces your unsaved changes."
        confirm="Import"
        onConfirm={() => {
          if (dialog?.kind === "import") onImport(dialog.name, dialog.source, dialog.ignored);
        }}
        onClose={() => {
          onClose("import");
        }}
      />
    </>
  );
}
