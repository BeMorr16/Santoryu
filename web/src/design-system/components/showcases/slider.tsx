import { useState } from "react";
import { Slider, type SliderOwnProps } from "../../../components/Slider/Slider.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { SliderExample } from "../examples/SliderExample.tsx";
import sliderExampleSource from "../examples/SliderExample.tsx?raw";

const sliderDocs = {
  label: {
    type: "string",
    description: "The visible label and the slider's accessible name. Required by the type.",
  },
  hideLabel: {
    type: "boolean",
    default: "false",
    description:
      "Hides the label visually; it still names the slider. The value text stays visible. Only where something else on screen says what it sets.",
  },
  hint: {
    type: "ReactNode",
    description: "Help text under the label, read as the slider's description.",
  },
  formatValue: {
    type: "(value: number) => string",
    default: "String",
    description: "Turns the value into the text shown beside the label and announced as the value.",
  },
  marks: {
    type: "readonly { value: number; label: string }[]",
    description:
      'Labelled stops under the track. On a mark, the announced value leads with its label: "Default, 4px".',
  },
  onValueChange: {
    type: "(value: number) => void",
    description: "Called with the new value as a number, alongside the native onChange.",
  },
} satisfies PropDocs<SliderOwnProps>;

const sliderKeyboard: readonly KeyboardRow[] = [
  { keys: "Arrow Right / Arrow Up", action: "Increases the value by one step." },
  { keys: "Arrow Left / Arrow Down", action: "Decreases the value by one step." },
  {
    keys: "Page Up / Page Down",
    action: "Changes the value by a larger step, as the browser sets it.",
  },
  { keys: "Home / End", action: "Sets the minimum or the maximum." },
];

const px = (value: number) => `${String(value)}px`;

function MarksExample() {
  return (
    <Slider
      label="Density"
      min={0.1875}
      max={0.3125}
      step={0.0125}
      defaultValue={0.25}
      formatValue={(value) => `${String(Math.round(value * 16 * 10) / 10)}px`}
      marks={[
        { value: 0.2, label: "Compact" },
        { value: 0.25, label: "Default" },
        { value: 0.3, label: "Roomy" },
      ]}
    />
  );
}

function HintExample() {
  return (
    <Slider
      label="Type scale"
      hint="How much larger headings are than body text."
      min={75}
      max={150}
      step={5}
      defaultValue={100}
      formatValue={(value) => `${String(value)}%`}
    />
  );
}

function ControlledExample() {
  const [width, setWidth] = useState(1);
  return (
    <>
      <Slider
        label="Border width"
        min={1}
        max={4}
        value={width}
        onValueChange={setWidth}
        formatValue={px}
      />
      <p>
        Stored value: <code>{width}</code>
      </p>
    </>
  );
}

function HiddenLabelExample() {
  return <Slider label="Preview zoom" hideLabel defaultValue={100} min={50} max={200} step={10} />;
}

function DisabledExample() {
  return (
    <Slider label="Locked radius" defaultValue={8} min={0} max={24} formatValue={px} disabled />
  );
}

export const sliderShowcase: Showcase = {
  id: "slider",
  exports: ["Slider"],
  purpose: "A labelled range input that shows its value as text, with optional labelled marks.",
  main: { Example: SliderExample, source: sliderExampleSource, file: "SliderExample.tsx" },
  examples: [
    { title: "Marks", layout: "column", Content: MarksExample },
    { title: "Hint", layout: "column", Content: HintExample },
    { title: "Controlled", layout: "column", Content: ControlledExample },
    { title: "Hidden label", layout: "column", Content: HiddenLabelExample },
    { title: "Disabled", layout: "column", Content: DisabledExample },
  ],
  props: [{ part: "Slider", docs: sliderDocs }],
  propsNote:
    "Native range props (value, defaultValue, min, max, step, onChange, name, disabled, ref and the rest) go to the <input>; value and defaultValue are numbers, and min, max and step default to 0, 100 and 1. className and style go to the wrapper.",
  nativePropsToRoot: false,
  tokens: "slider",
  keyboard: sliderKeyboard,
  a11y: [
    "A native <input type=\"range\"> with a visible <label> tied to it, so it's announced as a slider with its name, and every browser's own keyboard support works. A label is required by the type.",
    "The value is shown as text beside the label, so it isn't conveyed by the thumb's position alone. The same text is the slider's aria-valuetext, so it's announced with its unit. The text isn't an <output>, whose status role would announce every step a second time.",
    "Marks are a visual aid, hidden from screen readers; on a mark, the announced value leads with the mark's label instead.",
    "The thumb is 24px across (WCAG 2.5.8) and takes the focus ring. It's checked to 3:1 against the surfaces, as is the track, in both themes. In forced colors the track and thumb take system colors.",
    "Disabled sliders use native disabled: they can't be focused or changed.",
  ],
};
