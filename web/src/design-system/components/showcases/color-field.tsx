import { useState } from "react";
import {
  ColorField,
  type ColorFieldOwnProps,
  type Hex,
} from "../../../components/ColorField/ColorField.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { ColorFieldExample } from "../examples/ColorFieldExample.tsx";
import colorFieldExampleSource from "../examples/ColorFieldExample.tsx?raw";

const colorFieldDocs = {
  label: {
    type: "string",
    description:
      "The visible legend. It names the group and the color picker. Required by the type.",
  },
  hint: {
    type: "ReactNode",
    description: "Help text under the legend, read as the group's description.",
  },
  value: { type: "Hex", description: 'Controlled value, "#rrggbb". Pair with onValueChange.' },
  defaultValue: { type: "Hex", default: '"#000000"', description: "Uncontrolled initial value." },
  onValueChange: {
    type: "(value: Hex) => void",
    description:
      'Called with each new valid value, lowercase "#rrggbb": from the picker, a swatch, or hex text as soon as it parses.',
  },
  swatches: {
    type: "readonly { value: Hex; name: string }[]",
    description:
      "Suggested colors, shown as buttons named by name, with the hex as their description. The one matching the value is pressed.",
  },
  swatchesLabel: {
    type: "string",
    default: '"Suggested colors"',
    description: "The swatch group's accessible name.",
  },
  disabled: {
    type: "boolean",
    default: "false",
    description: "Disables the whole fieldset: the picker, the hex field and the swatches.",
  },
} satisfies PropDocs<ColorFieldOwnProps>;

const colorFieldKeyboard: readonly KeyboardRow[] = [
  { keys: "Tab", action: "Moves to the color picker, then the hex field, then each swatch." },
  {
    keys: "Enter / Space",
    action: "On the picker, opens the browser's color dialog. On a swatch, sets its color.",
  },
];

function HexOnlyExample() {
  return <ColorField label="Background" defaultValue="#fbf8f2" />;
}

function ControlledExample() {
  const [color, setColor] = useState<Hex>("#5b3fa6");
  return (
    <>
      <ColorField
        label="Second accent"
        value={color}
        onValueChange={setColor}
        swatches={[
          { value: "#5b3fa6", name: "Violet 600" },
          { value: "#4a3290", name: "Violet 700" },
          { value: "#3d2875", name: "Violet 800" },
        ]}
        swatchesLabel="Violet ramp"
      />
      <p>
        Stored value: <code>{color}</code>
      </p>
    </>
  );
}

function InvalidHexExample() {
  return (
    <ColorField
      label="Accent"
      hint='Type "#12" and leave the field: the error shows, and the last valid color stays.'
      defaultValue="#c49a4e"
    />
  );
}

function DisabledExample() {
  return (
    <ColorField
      label="Status color"
      defaultValue="#c8372c"
      swatches={[{ value: "#c8372c", name: "Red 600" }]}
      disabled
    />
  );
}

export const colorFieldShowcase: Showcase = {
  id: "color-field",
  exports: ["ColorField"],
  purpose:
    "A color input: a native color picker and a hex field under one legend, with optional suggested swatches.",
  main: {
    Example: ColorFieldExample,
    source: colorFieldExampleSource,
    file: "ColorFieldExample.tsx",
  },
  examples: [
    { title: "Hex only", layout: "column", Content: HexOnlyExample },
    { title: "Controlled", layout: "column", Content: ControlledExample },
    { title: "Invalid hex", layout: "column", Content: InvalidHexExample },
    { title: "Disabled", layout: "column", Content: DisabledExample },
  ],
  props: [{ part: "ColorField", docs: colorFieldDocs }],
  propsNote:
    'Native <fieldset> props (className, id, ref and the rest) go to the fieldset. Hex is a template type for "#…" strings; the value is always lowercase "#rrggbb". The hex field reads "#rgb", "#rrggbb", or either without "#", in any case.',
  tokens: "color-field",
  keyboard: colorFieldKeyboard,
  a11y: [
    'A <fieldset> whose <legend> names the group, and the native color picker inside it through aria-labelledby. The hex field is a TextField labelled "Hex", so the group reads as, for example, "Action color, group", then "Hex, edit text".',
    "The value is always shown as hex text, so it never relies on color alone.",
    "Hex text is applied as soon as it's a valid color. If it isn't valid when the field loses focus, the field shows an error with a warning icon, is marked invalid, and the last valid color stays.",
    "Each swatch is a toggle button named by its swatch name, with the hex as its description and both in a tooltip. The one matching the value is pressed, shown by a ring around it, outside a gap, so it reads on light and dark swatches alike, and not by color. In forced colors the pressed swatch gets a thick system-color border, apart from the focus outline.",
    "Swatches are 24px (WCAG 2.5.8), and swatch and picker outlines are checked to 3:1 against the surfaces in both themes, so a color close to the page still has a visible edge. In forced colors the colors themselves stay, with system-color outlines.",
  ],
};
