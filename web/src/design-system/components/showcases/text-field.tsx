import { Stack } from "../../../components/Stack/Stack.tsx";
import { TextField, type TextFieldOwnProps } from "../../../components/TextField/TextField.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { TextFieldExample } from "../examples/TextFieldExample.tsx";
import textFieldExampleSource from "../examples/TextFieldExample.tsx?raw";

const textFieldDocs = {
  label: {
    type: "string",
    description:
      "The visible label and the field's accessible name. Required by the type. Plain text, so the clear button's name can be built from it.",
  },
  hideLabel: {
    type: "boolean",
    default: "false",
    description:
      'Hides the label visually; it still names the field. Only where something else on screen says what the field is for. It can\'t be combined with required, since the visible "(required)" is in the label.',
  },
  hint: {
    type: "ReactNode",
    description: "Help text under the label, read as the field's description.",
  },
  error: {
    type: "ReactNode",
    description:
      "An error message under the field, with a warning icon. Marks the field invalid and is read after the hint.",
  },
  type: {
    type: '"text" | "search" | "email" | "url" | "tel" | "number"',
    default: '"text"',
    description:
      'The native input type. "search" adds a search icon that hides while the field has focus, and the clear button. "number" takes the native min, max and step.',
  },
  size: {
    type: '"sm" | "md"',
    default: '"md"',
    description: "32px or 40px tall, matching Button.",
  },
  iconStart: {
    type: "IconName",
    description:
      'A decorative icon at the start of the field. A search field shows "search" unless this names another.',
  },
  clearable: {
    type: "boolean",
    default: 'type === "search"',
    description:
      "Shows an icon-only clear button while the field has a value, and lets Escape clear it.",
  },
  clearLabel: {
    type: "string",
    default: "`Clear ${label}`",
    description: "The clear button's accessible name and tooltip.",
  },
} satisfies PropDocs<TextFieldOwnProps>;

const textFieldKeyboard: readonly KeyboardRow[] = [
  { keys: "Tab", action: "Moves into the field, then to its clear button when it shows one." },
  {
    keys: "Escape",
    action:
      "Clears a clearable field that has a value, keeping focus in it. With no value, it does nothing, so a surrounding dialog can still close.",
  },
];

function HintExample() {
  return <TextField label="Username" hint="Letters and numbers only." />;
}

function ErrorExample() {
  return (
    <TextField
      label="Email"
      type="email"
      defaultValue="ben@"
      error="Enter an email address, like name@example.com."
    />
  );
}

function RequiredExample() {
  return <TextField label="Name" required autoComplete="name" />;
}

function SizesExample() {
  return (
    <Stack>
      <TextField label="Small" size="sm" />
      <TextField label="Medium (default)" />
    </Stack>
  );
}

function SearchExample() {
  return <TextField label="Search the docs" type="search" defaultValue="tokens" />;
}

function ClearableExample() {
  return <TextField label="Display name" defaultValue="Ben" clearable />;
}

function StartIconExample() {
  return <TextField label="Website" type="url" iconStart="external-link" />;
}

function HiddenLabelExample() {
  return <TextField label="Search this page" type="search" hideLabel />;
}

function DisabledExample() {
  return <TextField label="Account ID" defaultValue="A-1024" disabled />;
}

export const textFieldShowcase: Showcase = {
  id: "text-field",
  exports: ["TextField"],
  purpose: "A labelled text input, with an optional hint, error, start icon and clear button.",
  main: { Example: TextFieldExample, source: textFieldExampleSource, file: "TextFieldExample.tsx" },
  examples: [
    { title: "Hint", layout: "column", Content: HintExample },
    { title: "Error", layout: "column", Content: ErrorExample },
    { title: "Required", layout: "column", Content: RequiredExample },
    { title: "Sizes", layout: "column", Content: SizesExample },
    { title: "Search", layout: "column", Content: SearchExample },
    { title: "Clearable", layout: "column", Content: ClearableExample },
    { title: "Start icon", layout: "column", Content: StartIconExample },
    { title: "Hidden label", layout: "column", Content: HiddenLabelExample },
    { title: "Disabled", layout: "column", Content: DisabledExample },
  ],
  props: [{ part: "TextField", docs: textFieldDocs }],
  propsNote:
    "Unlike the other components, TextField's native props (value, defaultValue, onChange, name, required, disabled, placeholder, autoComplete, ref and the rest) go to the <input>, since they belong to it. className and style go to the wrapper, so layout and token overrides cover the whole field. Clearing sets the value and fires an ordinary change, so onChange sees it as it sees typing.",
  nativePropsToRoot: false,
  tokens: "text-field",
  keyboard: textFieldKeyboard,
  a11y: [
    "A native <input> with a visible <label> tied to it, so clicking the label focuses the field and the label is its name. A label is required by the type.",
    "The hint and the error are read as the field's description, hint first. An error also sets aria-invalid, and shows a warning icon beside its text, so it isn't shown by color alone.",
    'Required fields use native required, which screen readers announce. The visible "(required)" is hidden from them, so it isn\'t read twice.',
    "Disabled fields use native disabled: they can't be focused and aren't submitted with a form.",
    "The start icon is decorative. A search field's icon is hidden while the field has focus, and the text moves into its space, so there's no gap before what's typed.",
    "The clear button is icon-only, named \"Clear\" and the label, with its name as a tooltip. It follows the field in Tab order and puts focus back in the field. The browser's own search clear button is hidden, so there's only one.",
    "The boundary is checked to 3:1 against the surfaces, text and the placeholder to 4.5:1, in both themes. In forced colors the boundary takes a system color and the focus ring stays.",
  ],
};
