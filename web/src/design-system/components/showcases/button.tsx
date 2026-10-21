import { useState, type ReactNode } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { VisuallyHidden } from "../../../components/VisuallyHidden/VisuallyHidden.tsx";
import { Announced } from "../Announced.tsx";
import { buttonDocs } from "../shared-docs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { ButtonExample } from "../examples/ButtonExample.tsx";
import buttonExampleSource from "../examples/ButtonExample.tsx?raw";

const variants = ["primary", "secondary", "ghost"] as const;

/** The customized example's CSS, shown under it and applied by `.brandCta`. */
export const brandCtaCss = `.brandCta {
  --component-button-primary-background: var(--color-accent-text);
  --component-button-primary-border: var(--color-accent-text);
  --component-button-primary-background-hover: var(--color-link-hover);
}`;

/** Icon-only buttons, captioned with their size and how they're named (refinement R3.11). */
const iconOnly: readonly { caption: string; button: ReactNode }[] = [
  {
    caption: "sm · aria-label",
    button: <Button size="sm" iconStart="check" aria-label="Mark as done" />,
  },
  { caption: "md · aria-label", button: <Button iconStart="arrow-right" aria-label="Next" /> },
  {
    caption: "sm · VisuallyHidden",
    button: (
      <Button size="sm" iconStart="chevron-down">
        <VisuallyHidden>Show more</VisuallyHidden>
      </Button>
    ),
  },
  {
    caption: "md · VisuallyHidden",
    button: (
      <Button iconStart="chevron-down">
        <VisuallyHidden>Show more</VisuallyHidden>
      </Button>
    ),
  },
];

/** A toggle's caption. The label stays the same; the state is announced with it (APG). */
function AnnouncedToggle({ name, pressed }: { name: string; pressed: boolean }) {
  const announced = { name, role: `toggle button, ${pressed ? "pressed" : "not pressed"}` };
  return <Announced {...announced} />;
}

function TogglesExample() {
  const [grid, setGrid] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [done, setDone] = useState(false);
  const [notify, setNotify] = useState(true);
  return (
    <>
      <div className={styles.row}>
        <Button
          aria-pressed={grid}
          onClick={() => {
            setGrid(!grid);
          }}
        >
          Show grid
        </Button>
        <AnnouncedToggle name="Show grid" pressed={grid} />
      </div>
      <div className={styles.row}>
        <Button
          variant="ghost"
          aria-pressed={wrap}
          onClick={() => {
            setWrap(!wrap);
          }}
        >
          Wrap lines
        </Button>
        <AnnouncedToggle name="Wrap lines" pressed={wrap} />
      </div>
      <div className={styles.row}>
        <Button
          variant="ghost"
          iconStart="check"
          aria-label="Mark as done"
          aria-pressed={done}
          onClick={() => {
            setDone(!done);
          }}
        />
        <AnnouncedToggle name="Mark as done" pressed={done} />
      </div>
      <div className={styles.row}>
        <Button
          variant="primary"
          aria-pressed={notify}
          onClick={() => {
            setNotify(!notify);
          }}
        >
          Notify me
        </Button>
        <AnnouncedToggle name="Notify me" pressed={notify} />
      </div>
    </>
  );
}

function VariantsExample() {
  return (
    <>
      {variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </>
  );
}

function SizesExample() {
  return (
    <>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
    </>
  );
}

function IconsExample() {
  return (
    <>
      <Button variant="primary" iconEnd="arrow-right">
        Get in touch
      </Button>
      <Button iconStart="mail">Email me</Button>
    </>
  );
}

function IconOnlyExample() {
  return (
    <Stack as="ul" direction="horizontal" gap="md">
      {iconOnly.map(({ caption, button }) => (
        <li key={caption} className={styles.tile}>
          {button}
          <code>{caption}</code>
        </li>
      ))}
    </Stack>
  );
}

function DisabledStillFocusableExample() {
  return (
    <>
      {variants.map((variant, index) => (
        <Button
          key={variant}
          variant={variant}
          disabled
          disabledReason={index === 0 ? "Your last note is still sending" : undefined}
        >
          Sending…
        </Button>
      ))}
    </>
  );
}

function LongLabelExample() {
  return (
    <div className={styles.narrow}>
      <Button variant="primary" iconEnd="arrow-right">
        Send me a note about a project you have in mind
      </Button>
    </div>
  );
}

function CustomizedWithAComponentTokenExample() {
  return (
    <>
      <div className={styles.brandCta}>
        <Button variant="primary" iconEnd="arrow-right">
          See the projects
        </Button>
      </div>
      <CodeBlock label="CSS" language="css">
        {brandCtaCss}
      </CodeBlock>
    </>
  );
}

export const buttonShowcase: Showcase = {
  id: "button",
  exports: ["Button"],
  purpose: "A native button for actions, in three levels of emphasis.",
  main: { Example: ButtonExample, source: buttonExampleSource, file: "ButtonExample.tsx" },
  examples: [
    { title: "Variants", Content: VariantsExample },
    { title: "Sizes", Content: SizesExample },
    { title: "Icons", Content: IconsExample },
    { title: "Icon-only", Content: IconOnlyExample },
    { title: "Toggles", layout: "column", Content: TogglesExample },
    { title: "Disabled (still focusable)", Content: DisabledStillFocusableExample },
    { title: "Long label", layout: "column", Content: LongLabelExample },
    {
      title: "Customized with a component token",
      layout: "column",
      Content: CustomizedWithAComponentTokenExample,
    },
  ],
  props: [{ part: "Button", docs: buttonDocs }],
  tokens: "button",
  keyboard: [
    {
      keys: "Enter / Space",
      action:
        "Activates the button, or flips a toggle. While disabled it does neither, and shows the disabledReason if there is one.",
    },
    { keys: "Tab", action: "Moves focus to it, including when disabled." },
  ],
  a11y: [
    'Always a native <button>, type="button" unless set.',
    "Named by its text. Icon-only buttons need an icon plus aria-label or aria-labelledby (a type error otherwise), or a VisuallyHidden label. With no visible text they're square.",
    "aria-pressed makes a toggle on any variant: the label stays the same and the pressed look shows the state. A button whose label changes (“Show grid” ↔ “Hide grid”) is a plain button, without aria-pressed.",
    "disabled sets aria-disabled, not the native attribute: it stays focusable and announced, and blocks clicks, keys and form submission.",
    "A disabledReason is the disabled button's accessible description, and shows as a tooltip on hover, keyboard focus, and a press or tap (the first Disabled example).",
    "Icon-only buttons show their name as a tooltip on hover and keyboard focus, for sighted users who don't know the icon. It isn't announced again. Not for buttons named by aria-labelledby, whose name is already on screen.",
    "In forced colors, disabled shows GrayText and pressed shows Highlight, since the forced palette drops their background and border colors.",
    "Target size at least 32px tall; focus ring 2px in component.button.focus-ring-color, 3:1 against the surface.",
  ],
};
