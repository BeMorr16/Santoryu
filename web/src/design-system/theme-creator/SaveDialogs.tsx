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

/**
 * A save that a dialog interrupted: the saved theme it updates (null for a new one) and the name
 * it saves under (theme-creator-controls design §3).
 */
export interface PendingSave {
  target: string | null;
  name: string;
}

/**
 * The theme creator's dialogs (theme-creator R2.2, R2.4, R2.9, R3.3, R11.2; design §8.3, §8.7;
 * theme-creator-controls R4.5).
 */
export type BarDialog =
  | { kind: "contrast"; failures: readonly PairingResult[]; save: PendingSave }
  | { kind: "limit"; save: PendingSave }
  | { kind: "rename"; theme: StoredTheme }
  /** `then` is the save to finish once it's deleted, when the limit dialog asked. */
  | { kind: "delete"; theme: StoredTheme; then: PendingSave | null }
  /**
   * A theme's name, asked before saving it as a new theme (theme-creator-controls R4.1, R4.5):
   * from Save while it isn't saved yet, or from Save as new. `error` is a name problem found since.
   */
  | { kind: "name"; save: PendingSave; asNew: boolean; error?: string | undefined }
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

/** A theme name in a dialog, checked before it's submitted (theme-creator R2.6). */
function NameForm({
  initialName,
  initialError,
  submitLabel,
  exclude,
  saved,
  onSubmit,
  onDone,
}: {
  initialName: string;
  initialError?: string | undefined;
  submitLabel: string;
  /** The saved theme whose own name doesn't count as taken: the one being renamed. */
  exclude: string | null;
  saved: readonly StoredTheme[];
  onSubmit: (name: string) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(initialError);
  const field = useRef<HTMLInputElement>(null);
  return (
    <form
      noValidate
      className={styles.renameForm}
      onSubmit={(event) => {
        event.preventDefault();
        const problem = nameProblem(name, saved, exclude);
        if (problem !== undefined) {
          setError(problem);
          field.current?.focus();
          return;
        }
        // Closed first: what the submit does may open another dialog of this kind.
        onDone();
        onSubmit(name.trim());
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
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}

export interface SaveDialogsProps {
  dialog: BarDialog | null;
  saved: readonly StoredTheme[];
  /** The custom theme the site is using, if any. */
  activeId: string | undefined;
  /** Closes this kind of dialog, if it's still the one open: another may have replaced it. */
  onClose: (kind: BarDialog["kind"]) => void;
  /** Runs a save's checks: from the name dialog, or Overwrite in the limit dialog. */
  onSave: (pending: PendingSave) => void;
  /** Saves without the contrast check: Save anyway. */
  onSaveAnyway: (pending: PendingSave) => void;
  onEditToken: (token: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (theme: StoredTheme, then: PendingSave | null) => void;
  onDiscard: () => void;
  onStart: (start: DraftStart) => void;
  onImport: (name: string, source: ThemeSource, ignored: number) => void;
  onShowDialog: (dialog: BarDialog) => void;
}

export function SaveDialogs({
  dialog,
  saved,
  activeId,
  onClose,
  onSave,
  onSaveAnyway,
  onEditToken,
  onRename,
  onDelete,
  onDiscard,
  onStart,
  onImport,
  onShowDialog,
}: SaveDialogsProps) {
  const kind = dialog?.kind;
  return (
    <>
      {/*
        First: a save it starts may open the contrast or limit dialog in the same render. Effects
        run in order, so this one closes, returning focus to its opener, before that one opens
        and records its opener (WCAG 2.4.3).
      */}
      <Dialog
        open={kind === "name"}
        onClose={() => {
          onClose("name");
        }}
        title={dialog?.kind === "name" && dialog.asNew ? "Save as new theme" : "Save theme"}
      >
        {dialog?.kind === "name" && (
          <NameForm
            key={dialog.error}
            initialName={dialog.save.name}
            initialError={dialog.error}
            submitLabel="Save"
            exclude={dialog.save.target}
            saved={saved}
            onSubmit={(name) => {
              onSave({ ...dialog.save, name });
            }}
            onDone={() => {
              onClose("name");
            }}
          />
        )}
      </Dialog>
      <ContrastDialog
        open={kind === "contrast"}
        failures={dialog?.kind === "contrast" ? dialog.failures : []}
        onSaveAnyway={() => {
          if (dialog?.kind === "contrast") onSaveAnyway(dialog.save);
        }}
        onEditToken={onEditToken}
        onClose={() => {
          onClose("contrast");
        }}
      />
      <LimitDialog
        open={kind === "limit"}
        saved={saved}
        onOverwrite={(id) => {
          if (dialog?.kind === "limit") onSave({ target: id, name: dialog.save.name });
        }}
        onDelete={(theme) => {
          if (dialog?.kind === "limit") onShowDialog({ kind: "delete", theme, then: dialog.save });
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
          <NameForm
            key={dialog.theme.id}
            initialName={dialog.theme.name}
            submitLabel="Rename"
            exclude={dialog.theme.id}
            saved={saved}
            onSubmit={(name) => {
              onRename(dialog.theme.id, name);
            }}
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
          if (dialog?.kind === "delete") onDelete(dialog.theme, dialog.then);
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
