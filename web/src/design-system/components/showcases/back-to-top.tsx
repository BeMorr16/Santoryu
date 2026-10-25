import { BackToTop, type BackToTopOwnProps } from "../../../components/BackToTop/BackToTop.tsx";
import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Announced } from "../Announced.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonLookDocs } from "../shared-docs.ts";
import { BackToTopExample } from "../examples/BackToTopExample.tsx";
import backToTopExampleSource from "../examples/BackToTopExample.tsx?raw";

const variants = ["primary", "secondary", "ghost"] as const;

const backToTopDocs = {
  variant: buttonLookDocs.variant,
  size: buttonLookDocs.size,
  label: {
    type: "string",
    default: '"Back to top"',
    description: "The accessible name, and the visible text with showLabel.",
  },
  showLabel: {
    type: "boolean",
    default: "false",
    description:
      "Shows the label beside the arrow. Without it the button is icon-only and shows its name as a tooltip on hover and focus.",
  },
  threshold: {
    type: "number",
    default: "the viewport's height",
    description:
      "How far, in pixels, the page scrolls before the button appears. In the corner it only appears on viewports at least 48em (768px) wide; phones scroll to the top from the status bar.",
  },
  visible: {
    type: "boolean",
    description:
      "Overrides the automatic visibility: true always shows it, false always hides it. Hidden, it's out of the tab order and the accessibility tree.",
  },
  placement: {
    type: '"corner" | "inline"',
    default: '"corner"',
    description:
      "corner is fixed at the viewport's bottom-right corner (bottom-left in right-to-left text), with a shadow. inline sits in the flow.",
  },
  focusTarget: {
    type: "() => HTMLElement | null",
    default: "main's h1, else main",
    description:
      "Where focus goes after scrolling. An element that can't take focus gets tabindex=-1 first.",
  },
} satisfies PropDocs<BackToTopOwnProps>;

export const backToTopKeyboard: readonly KeyboardRow[] = [
  { keys: "Enter", action: "Scrolls to the top and moves focus to the page's heading." },
  { keys: "Space", action: "Scrolls to the top and moves focus to the page's heading." },
];

/** The customized example's CSS, shown under it and applied by `.customBackToTop`. */
export const customBackToTopCss = `.customBackToTop {
  --component-back-to-top-offset: var(--space-layout-sm);
  --component-back-to-top-shadow: var(--effect-elevation-raised);
}`;

function VariantsExample() {
  return (
    <>
      {variants.map((variant) => (
        <BackToTop key={variant} variant={variant} placement="inline" visible />
      ))}
    </>
  );
}

function WithItsLabelExample() {
  return (
    <>
      <BackToTop placement="inline" visible showLabel />
      <Announced name="Back to top" role="button" />
    </>
  );
}

function SizesExample() {
  return (
    <>
      <BackToTop size="sm" placement="inline" visible showLabel />
      <BackToTop size="md" placement="inline" visible showLabel />
    </>
  );
}

function OnEveryPageExample() {
  return (
    <p>
      The site shell shows one in the bottom-right corner of every page, once it&apos;s scrolled
      down by one screen, on screens at least 768px wide. Scroll down to see this site&apos;s own.
    </p>
  );
}

function CustomizedWithComponentTokensExample() {
  return (
    <>
      {/* The frame contains the fixed corner placement, so it shows its offset and shadow here. */}
      <div className={styles.cornerFrame}>
        <BackToTop className={styles.customBackToTop} visible label="Back to top (example)" />
      </div>
      <CodeBlock label="CSS" language="css">
        {customBackToTopCss}
      </CodeBlock>
    </>
  );
}

export const backToTopShowcase: Showcase = {
  id: "back-to-top",
  exports: ["BackToTop"],
  purpose:
    "A button that appears once a page is scrolled down, and takes the reader and their focus back to the top.",
  main: { Example: BackToTopExample, source: backToTopExampleSource, file: "BackToTopExample.tsx" },
  examples: [
    { title: "Variants", Content: VariantsExample },
    { title: "With its label", Content: WithItsLabelExample },
    { title: "Sizes", Content: SizesExample },
    { title: "On every page", layout: "column", Content: OnEveryPageExample },
    {
      title: "Customized with component tokens",
      layout: "column",
      Content: CustomizedWithComponentTokensExample,
    },
  ],
  props: [{ part: "BackToTop", docs: backToTopDocs }],
  propsNote:
    "There are no children: the arrow and the label are built in. It's a library Button, so the native button props, className and ref reach the button, except disabled and aria-pressed. An onClick runs first; calling event.preventDefault() in it cancels the scroll and the focus move.",
  tokens: "back-to-top",
  keyboard: backToTopKeyboard,
  a11y: [
    'A native button named "Back to top" (or its label). Icon-only, it shows that name as a tooltip on hover and keyboard focus; the arrow is decorative.',
    "In the corner it only appears on viewports at least 48em (768px) wide: phones scroll to the top from the status bar, and on a small screen with large text the sticky header leaves no room to keep focused content clear of it.",
    "Until the page is scrolled past the threshold it's hidden from sight, from the tab order and from the accessibility tree. Once shown, it stays while it has focus, so focus never drops to the page when it scrolls up under the button.",
    "Activating it scrolls to the top and moves focus to the page's h1 (or main), without a second scroll, so the next Tab continues from the top of the page.",
    "It scrolls smoothly only when the reader hasn't asked for reduced motion; otherwise it jumps. Showing and hiding fade and slide in, with no slide and no fade time under reduced motion.",
    "While the corner button shows, the page keeps a scroll padding at its bottom as tall as the button and its offset, so it never covers a focused element (WCAG 2.4.11).",
    "It has Button's focus ring, 40px target (32px when small), contrast and forced-colors look.",
  ],
};
