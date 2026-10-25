import { useId, useState } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import { Link } from "../../../components/Link/Link.tsx";
import {
  VisuallyHidden,
  type VisuallyHiddenOwnProps,
  type VisuallyHiddenProps,
} from "../../../components/VisuallyHidden/VisuallyHidden.tsx";
import { Announced } from "../Announced.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { VisuallyHiddenExample } from "../examples/VisuallyHiddenExample.tsx";
import visuallyHiddenExampleSource from "../examples/VisuallyHiddenExample.tsx?raw";

const props = {
  as: {
    type: '"span" | "div" | "p" | "a" | "label" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "strong" | "em" | "small" | "mark" | "s" | "legend" | "code" | "kbd" | "samp" | "abbr" | "cite" | "q" | "time" | "blockquote" | "figcaption" | "caption" | "li" | "dt" | "dd"',
    default: '"span"',
    description: "The root element.",
  },
  focusable: {
    type: "boolean",
    default: "false",
    description:
      'Show the content as an overlay while it or a descendant has focus, as skip links do. Required with as="a".',
  },
} satisfies PropDocs<VisuallyHiddenOwnProps & Pick<VisuallyHiddenProps, "as">>;

// The space sits outside the hidden span: some name implementations (dom-accessibility-api, used
// by Testing Library) trim each element's text, so a leading space inside it can be lost.
const readMore = { visible: "Read more", hidden: "about tokens" };

/**
 * What a screen reader announces for each example: its accessible name and role (refinement
 * R2.9). The hidden text uses the same strings, so a caption can't drift from its example.
 */
export const announced = {
  iconButton: { name: "Mark as done", role: "button" },
  linkContext: { name: `${readMore.visible} ${readMore.hidden}`, role: "link" },
  heading: { name: "Projects", role: "heading level 4" },
  label: { name: "Search the design system", role: "search field" },
  skipLink: { name: "Skip to the VisuallyHidden section", role: "link" },
  wrapper: { name: "Back to the section top", role: "link" },
} as const;

/**
 * While pressed, the panel shows every example's hidden text in place, outlined. CSS only (the
 * panel :has() the pressed toggle), so the accessibility tree is unchanged (refinement R2.10).
 */
function RevealHiddenTextExample() {
  const [reveal, setReveal] = useState(false);
  return (
    <>
      <div>
        <Button
          variant="secondary"
          size="sm"
          className={styles.revealToggle}
          aria-pressed={reveal}
          onClick={() => {
            setReveal(!reveal);
          }}
        >
          Show hidden content
        </Button>
      </div>
      <p>
        Shows the hidden text in the examples below, outlined. Screen readers get the same as
        before.
      </p>
    </>
  );
}

function IconOnlyButtonExample() {
  return (
    <>
      <div>
        <Button iconStart="check">
          <VisuallyHidden className={styles.revealable}>{announced.iconButton.name}</VisuallyHidden>
        </Button>
      </div>
      <Announced {...announced.iconButton} />
    </>
  );
}

function ExtraLinkContextExample() {
  return (
    <>
      <div>
        <Link href="/design-system/tokens">
          {readMore.visible}{" "}
          <VisuallyHidden className={styles.revealable}>{readMore.hidden}</VisuallyHidden>
        </Link>
      </div>
      <Announced {...announced.linkContext} />
    </>
  );
}

function HiddenHeadingExample() {
  return (
    <>
      <div>
        <VisuallyHidden as="h4" className={styles.revealable}>
          {announced.heading.name}
        </VisuallyHidden>
        <ul className={styles.notes}>
          <li>Personal site</li>
          <li>Component library</li>
        </ul>
      </div>
      <Announced {...announced.heading} />
    </>
  );
}

function HiddenFormLabelExample() {
  const searchId = useId();
  return (
    <>
      {/* The Search button shows the field's purpose, so its label can be hidden (WCAG 3.3.2). */}
      <div className={styles.row}>
        <VisuallyHidden as="label" htmlFor={searchId} className={styles.revealable}>
          {announced.label.name}
        </VisuallyHidden>
        <input id={searchId} type="search" />
        <Button size="sm">Search</Button>
      </div>
      <Announced {...announced.label} />
    </>
  );
}

function SkipLinkExample() {
  return (
    <>
      <div>
        <VisuallyHidden as="a" focusable href="#visually-hidden" className={styles.revealable}>
          {announced.skipLink.name}
        </VisuallyHidden>
      </div>
      <Announced {...announced.skipLink} />
    </>
  );
}

function FocusableWrapperExample() {
  return (
    <>
      <div>
        <VisuallyHidden focusable className={styles.revealable}>
          <Link href="#visually-hidden">{announced.wrapper.name}</Link>
        </VisuallyHidden>
      </div>
      <Announced {...announced.wrapper} />
    </>
  );
}

export const visuallyHiddenShowcase: Showcase = {
  id: "visually-hidden",
  exports: ["VisuallyHidden"],
  purpose: "Text that assistive technology announces but the page doesn't show.",
  main: {
    Example: VisuallyHiddenExample,
    source: visuallyHiddenExampleSource,
    file: "VisuallyHiddenExample.tsx",
  },
  examples: [
    { title: "Reveal the hidden text", layout: "column", Content: RevealHiddenTextExample },
    { title: "Icon-only button", layout: "column", Content: IconOnlyButtonExample },
    { title: "Extra link context", layout: "column", Content: ExtraLinkContextExample },
    { title: "Hidden heading", layout: "column", Content: HiddenHeadingExample },
    { title: "Hidden form label", layout: "column", Content: HiddenFormLabelExample },
    { title: "Skip link (Tab to it)", layout: "column", Content: SkipLinkExample },
    { title: "Focusable wrapper", layout: "column", Content: FocusableWrapperExample },
  ],
  props: [{ part: "VisuallyHidden", docs: props }],
  propsNote:
    "className adds properties VisuallyHidden doesn't set (position, insets); it can't override the hidden clip or the focused look without higher specificity.",
  tokens: "visually-hidden",
  keyboard: [{ keys: "Tab", action: "With focusable, reaches the content and reveals it." }],
  a11y: [
    "No role of its own: the content keeps its element's semantics (span by default, or as).",
    "Clipped, not display: none, so it stays in the accessibility tree.",
    "focusable reveals it as an overlay while it or a descendant has focus (the skip-link pattern). It moves no other content; the caller places it with className.",
    'as="a" requires focusable, since a hidden link must show when focused. Without focusable, tabIndex can only be -1 (a programmatic focus target), so there is no invisible Tab stop. Hidden content with a focusable descendant must also be focusable, which types can\'t check.',
    "A hidden label must still be associated with its field (htmlFor). Hide a label only when the field's purpose is visible another way, such as an adjacent Search button.",
    "li, caption, dt and dd, and figcaption still need their parent element (ul or ol, table, dl, figure).",
    "Hidden emphasis (strong, em, small, mark, s) keeps its semantics, but most screen readers don't announce emphasis by default.",
    "The “Announced as” captions give each example's accessible name and role. Exact wording varies by screen reader.",
  ],
};
