import { useRef, useState, type ReactNode } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogButton,
  type DialogActionsOwnProps,
  type DialogButtonOwnProps,
  type DialogOwnProps,
  type DialogProps,
} from "../../../components/Dialog/Dialog.tsx";
import { TextField } from "../../../components/TextField/TextField.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { DialogExample } from "../examples/DialogExample.tsx";
import dialogExampleSource from "../examples/DialogExample.tsx?raw";

const dialogDocs = {
  open: {
    type: "boolean",
    description: "Required. Shows the dialog as a modal while true. Controlled: pair with onClose.",
  },
  onClose: {
    type: "() => void",
    description:
      "Required. Called on any close: Escape, a backdrop click, the Close button or a DialogButton. Set open to false here.",
  },
  onComplete: {
    type: '(result: "success" | "failure") => void',
    description:
      "Called with a DialogButton's result when one with a result is chosen, just before the dialog closes.",
  },
  title: {
    type: "ReactNode",
    description: "Required. The heading at the top, and the dialog's accessible name.",
  },
  titleIcon: { type: "IconName", description: "A decorative icon before the title." },
  titleLevel: {
    type: "2 | 3 | 4 | 5 | 6",
    default: "2",
    description: "The title's heading level, from the page outline. It always looks like an h4.",
  },
  size: {
    type: '"default" | "full"',
    default: '"default"',
    description:
      '"default" is as wide as a readable line, at most. "full" fills a narrow viewport, and leaves a margin round it from 48em.',
  },
  closeOnBackdrop: {
    type: "boolean",
    default: "true",
    description:
      "Closes on a click on the dimmed page. A press that starts inside the dialog doesn't count.",
  },
  closeOnEsc: {
    type: "boolean",
    default: "true",
    description:
      "Closes on Escape. Browsers may still close on a second Escape, so don't rely on it.",
  },
  role: {
    type: '"dialog" | "alertdialog"',
    default: '"dialog"',
    description:
      '"alertdialog" for an urgent message that needs a response, such as a confirmation.',
  },
  initialFocus: {
    type: "RefObject<HTMLElement | null>",
    description:
      "The element focused on open. Default: the first focusable element after the header, else Close.",
  },
  children: {
    type: "ReactNode",
    description: "The content under the header: usually a DialogBody, then DialogActions.",
  },
} satisfies PropDocs<DialogOwnProps>;

const actionsDocs = {
  justify: {
    type: '"start" | "end" | "center" | "space-between"',
    default: '"end"',
    description: "Where the actions sit along the row. They wrap on narrow screens.",
  },
} satisfies PropDocs<DialogActionsOwnProps>;

const buttonDocs = {
  result: {
    type: '"success" | "failure"',
    description:
      "Reported through the dialog's onComplete. Without one, the button only closes the dialog, after its own onClick.",
  },
} satisfies PropDocs<DialogButtonOwnProps>;

const dialogKeyboard: readonly KeyboardRow[] = [
  {
    keys: "Tab / Shift+Tab",
    action: "Moves between the dialog's controls. Focus stays inside the dialog while it's open.",
  },
  { keys: "Escape", action: "Closes the dialog, unless closeOnEsc is false." },
  {
    keys: "Enter / Space",
    action: "Activates the focused button. A DialogButton then closes the dialog.",
  },
];

/** A button that opens one example dialog, so each example holds its own open state. */
function ExampleDialog({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & Omit<DialogProps, "open" | "onClose" | "children">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        {...props}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        {children}
      </Dialog>
    </>
  );
}

function FormExample() {
  const [name, setName] = useState("Ocean");
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <>
      <ExampleDialog
        label="Rename theme"
        title="Rename theme"
        onComplete={(result) => {
          if (result === "success") setSaved(name);
        }}
      >
        <TextField
          label="Theme name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <DialogActions>
          <DialogButton result="failure">Cancel</DialogButton>
          <DialogButton variant="primary" result="success">
            Rename
          </DialogButton>
        </DialogActions>
      </ExampleDialog>
      <p role="status">{saved !== null && `Renamed to “${saved}”.`}</p>
    </>
  );
}

function FullSizeExample() {
  return (
    <ExampleDialog label="Open full dialog" title="Theme preview" size="full">
      <DialogBody>
        <p>
          A full dialog fills a narrow viewport, for content that needs the room. From 48em it
          leaves a margin all round, so the page behind still shows.
        </p>
      </DialogBody>
      <DialogActions>
        <DialogButton>Done</DialogButton>
      </DialogActions>
    </ExampleDialog>
  );
}

function NoBackdropCloseExample() {
  // The least destructive action takes focus first (APG).
  const save = useRef<HTMLButtonElement>(null);
  return (
    <ExampleDialog
      label="Open without backdrop close"
      title="Unsaved changes"
      closeOnBackdrop={false}
      initialFocus={save}
    >
      <DialogBody>
        <p>A click on the dimmed page leaves this dialog open. Escape and Close still close it.</p>
      </DialogBody>
      <DialogActions justify="space-between">
        <DialogButton result="failure">Discard</DialogButton>
        <DialogButton ref={save} variant="primary" result="success">
          Save
        </DialogButton>
      </DialogActions>
    </ExampleDialog>
  );
}

const terms = [
  "Themes you make here are saved in this browser only, under this site's storage.",
  "Clearing your browser's site data removes them, and so does Safari after seven days without a visit.",
  "Exporting a theme downloads a design tokens file, which you can import again later.",
  "Imported files are checked before anything changes: unknown tokens and out-of-range values are listed, and nothing is applied.",
  "Saved themes appear in the site's theme menu next to Light and Dark, and apply to every page.",
  "Deleting the theme you're using switches the site back to Light or Dark, whichever matches it.",
];

function LongBodyExample() {
  return (
    <ExampleDialog label="Open long dialog" title="How themes are kept">
      <DialogBody>
        {terms.map((term) => (
          <p key={term}>{term}</p>
        ))}
      </DialogBody>
      <DialogActions>
        <DialogButton variant="primary">Got it</DialogButton>
      </DialogActions>
    </ExampleDialog>
  );
}

export const dialogShowcase: Showcase = {
  id: "dialog",
  exports: ["Dialog", "DialogBody", "DialogActions", "DialogButton"],
  purpose:
    "A modal dialog on the native <dialog> element, for a confirmation, a short form or a message that needs an answer.",
  main: { Example: DialogExample, source: dialogExampleSource, file: "DialogExample.tsx" },
  examples: [
    { title: "Form", layout: "column", Content: FormExample },
    { title: "Full size", layout: "column", Content: FullSizeExample },
    { title: "No backdrop close", layout: "column", Content: NoBackdropCloseExample },
    { title: "Long body", layout: "column", Content: LongBodyExample },
  ],
  props: [
    { part: "Dialog", docs: dialogDocs },
    { part: "DialogActions", docs: actionsDocs },
    { part: "DialogButton", docs: buttonDocs },
  ],
  propsNote:
    "DialogBody takes a <div>'s props; the dialog is described by it. DialogButton takes every Button prop. Native <dialog> props go to the dialog element, and native <div> props to DialogBody and DialogActions.",
  tokens: "dialog",
  keyboard: dialogKeyboard,
  a11y: [
    "A native <dialog> opened with showModal(), so the browser puts it in the top layer, makes the rest of the page inert and handles Escape. The page behind doesn't scroll while it's open.",
    "Named by its title, which the type requires, and described by its DialogBody when it has one. Use role alertdialog for an urgent message that needs a response.",
    "Focus moves into the dialog on open: to initialFocus, else the first control after the header, else Close. For a confirmation, set initialFocus to the least destructive action. On close, focus returns to the control that opened it. The page behind is inert while the dialog is open, so to send focus elsewhere, move it in onClose.",
    'The Close button is icon-only, named "Close", with its name as a tooltip. Buttons keep their visible text as their name.',
    "A body taller than the dialog scrolls, and becomes a focusable group named by the title, so it can be scrolled from the keyboard in every browser.",
    "The surface and text use the raised surface and default text, checked to 4.5:1 in both themes. In forced colors the surface keeps its outline and the backdrop is the system's. The fade is 0ms under reduced motion.",
  ],
};
