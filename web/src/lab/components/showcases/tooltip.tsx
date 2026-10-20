import { useState } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import { Link } from "../../../components/Link/Link.tsx";
import {
  Tooltip,
  type TooltipOwnProps,
  type TooltipSide,
} from "../../../components/Tooltip/Tooltip.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const tooltipDocs = {
  content: {
    type: "ReactNode",
    description: "Required. The tooltip's text. No links, buttons or other interactive content.",
  },
  kind: {
    type: '"description" | "name"',
    default: '"description"',
    description:
      '"description" becomes the trigger\'s accessible description. "name" only shows the trigger\'s name and isn\'t announced: use it only when content matches that name.',
  },
  side: {
    type: '"top" | "bottom" | "start" | "end"',
    default: '"top"',
    description:
      "The side of the trigger it shows on, centered. It flips when it doesn't fit, and shifts to stay in the viewport.",
  },
  open: { type: "boolean", description: "Controlled open state; pair with onOpenChange." },
  defaultOpen: { type: "boolean", default: "false", description: "Uncontrolled initial state." },
  onOpenChange: {
    type: "(open: boolean) => void",
    description:
      "Called on every requested show or hide, controlled or not: hover, focus, Escape, a press, and another tooltip showing.",
  },
} satisfies PropDocs<TooltipOwnProps>;

export const tooltipKeyboard: readonly KeyboardRow[] = [
  { keys: "Tab", action: "Moves focus to the trigger, which shows its tooltip." },
  { keys: "Escape", action: "Hides the tooltip; focus stays on the trigger." },
];

/** The Description example's trigger and tooltip, and its caption built from the same strings. */
export const describedButton = {
  label: "Save draft",
  tooltip: "Saves without publishing",
} as const;

/** Its accessible name, then its role and description. */
const describedAnnounced = {
  name: describedButton.label,
  role: `button, ${describedButton.tooltip}`,
};

/** The customized example's CSS, shown under it and applied by `.customTooltip`. */
export const customTooltipCss = `.customTooltip {
  --component-tooltip-background: var(--color-accent-2-fill);
  --component-tooltip-text: var(--color-accent-2-fill-text);
}`;

const sides: readonly { side: TooltipSide; label: string }[] = [
  { side: "top", label: "Top" },
  { side: "bottom", label: "Bottom" },
  { side: "start", label: "Start" },
  { side: "end", label: "End" },
];

function Examples() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Example title="Description" layout="column">
        <div>
          <Tooltip content={describedButton.tooltip}>
            <Button>{describedButton.label}</Button>
          </Tooltip>
        </div>
        <Announced {...describedAnnounced} />
      </Example>
      <Example title="Icon-only names" layout="column">
        <div className={styles.row}>
          <Button iconStart="check" aria-label="Mark as done" />
          <Button iconStart="arrow-right" aria-label="Next" />
          <Button iconStart="chevron-down" aria-label="Show more" nameTooltip={false} />
        </div>
        <p>No tooltip on the last: nameTooltip={"{false}"}.</p>
      </Example>
      <Example title="Sides">
        {sides.map(({ side, label }) => (
          <Tooltip key={side} content={`Shown on the ${side} side`} side={side}>
            <Button>{label}</Button>
          </Tooltip>
        ))}
      </Example>
      <Example title="Disabled reason" layout="column">
        <div>
          <Button variant="primary" disabled disabledReason="Add a title first">
            Publish
          </Button>
        </div>
        <p>Press or tap it to see why it&apos;s disabled.</p>
      </Example>
      <Example title="In running text" layout="column">
        <p>
          Browse{" "}
          <Tooltip content="Every color, type and space token">
            <Link href="/lab/tokens">the token gallery</Link>
          </Tooltip>{" "}
          for every value the components use.
        </p>
      </Example>
      <Example title="Controlled" layout="column">
        <div className={styles.row}>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? "Hide" : "Show"}
          </Button>
          <Tooltip content="Pinned open from outside" open={open} onOpenChange={setOpen}>
            <Button>Pinned</Button>
          </Tooltip>
        </div>
        <p aria-live="polite">The tooltip is {open ? "shown" : "hidden"}.</p>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <div>
          <Tooltip content="Violet, from the accent-2 fill" className={styles.customTooltip}>
            <Button>Custom</Button>
          </Tooltip>
        </div>
        <pre className={styles.code}>
          <code>{customTooltipCss}</code>
        </pre>
      </Example>
    </>
  );
}

export const tooltipShowcase: Showcase = {
  id: "tooltip",
  name: "Tooltip",
  exports: ["Tooltip"],
  purpose:
    "A short hint for one control, on hover and keyboard focus: what it does, or the name of an icon-only control.",
  Examples,
  props: [{ part: "Tooltip", docs: tooltipDocs }],
  propsNote:
    'Its one child is the trigger: a focusable element that takes a ref and DOM props, as every library control does. content holds no links, buttons or other interactive content. Use kind="name" only when content repeats the trigger\'s accessible name. className and other native props go to the tooltip popup.',
  tokens: "tooltip",
  keyboard: tooltipKeyboard,
  a11y: [
    'A "description" tooltip has role="tooltip" and becomes the trigger\'s accessible description. A "name" tooltip repeats the trigger\'s name for sighted users, hidden from assistive technology so the name isn\'t announced twice.',
    "Its text is in the page from the start, so the description is there before JavaScript loads and without hovering.",
    "It shows after a 300ms hover, and at once while moving along a row of controls. Keyboard focus shows it at once, since a keyboard user has nothing else to wait for; focus from a mouse press doesn't.",
    "It stays until dismissed: Escape, moving the pointer off both the trigger and the tooltip, moving focus away, or pressing the trigger. The pointer can move onto it, and it never hides on a timer (WCAG 1.4.13).",
    "Touch shows no tooltips, except a disabled Button's reason, which a tap shows and a tap elsewhere hides.",
    "Never put essential information only in a tooltip: many visitors never see it.",
    "It fades over component.tooltip.transition-duration, 0ms under reduced motion.",
    "In forced colors, the bubble and its arrow are outlined in a system color.",
  ],
};
