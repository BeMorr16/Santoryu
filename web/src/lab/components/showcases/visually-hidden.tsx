import { useId, useState } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import { Link } from "../../../components/Link/Link.tsx";
import {
  VisuallyHidden,
  type VisuallyHiddenOwnProps,
  type VisuallyHiddenProps,
} from "../../../components/VisuallyHidden/VisuallyHidden.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

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
  label: { name: "Search the lab", role: "search field" },
  skipLink: { name: "Skip to the VisuallyHidden section", role: "link" },
  wrapper: { name: "Back to the section top", role: "link" },
} as const;

function Examples() {
  const searchId = useId();
  const [reveal, setReveal] = useState(false);
  // Shows the hidden content in place, outlined. CSS only, so the accessibility tree is unchanged.
  const revealClass = reveal ? styles.revealHidden : undefined;
  return (
    <>
      <div>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={reveal}
          onClick={() => {
            setReveal(!reveal);
          }}
        >
          Show hidden content
        </Button>
      </div>
      <Example title="Icon-only button" layout="column">
        <div>
          <Button iconStart="check">
            <VisuallyHidden className={revealClass}>{announced.iconButton.name}</VisuallyHidden>
          </Button>
        </div>
        <Announced {...announced.iconButton} />
      </Example>
      <Example title="Extra link context" layout="column">
        <div>
          <Link href="/lab/tokens">
            {readMore.visible}{" "}
            <VisuallyHidden className={revealClass}>{readMore.hidden}</VisuallyHidden>
          </Link>
        </div>
        <Announced {...announced.linkContext} />
      </Example>
      <Example title="Hidden heading" layout="column">
        <div>
          <VisuallyHidden as="h4" className={revealClass}>
            {announced.heading.name}
          </VisuallyHidden>
          <ul className={styles.notes}>
            <li>Personal site</li>
            <li>Component library</li>
          </ul>
        </div>
        <Announced {...announced.heading} />
      </Example>
      <Example title="Hidden form label" layout="column">
        {/* The Search button shows the field's purpose, so its label can be hidden (WCAG 3.3.2). */}
        <div className={styles.row}>
          <VisuallyHidden as="label" htmlFor={searchId} className={revealClass}>
            {announced.label.name}
          </VisuallyHidden>
          <input id={searchId} type="search" />
          <Button size="sm">Search</Button>
        </div>
        <Announced {...announced.label} />
      </Example>
      <Example title="Skip link (Tab to it)" layout="column">
        <div>
          <VisuallyHidden as="a" focusable href="#visually-hidden" className={revealClass}>
            {announced.skipLink.name}
          </VisuallyHidden>
        </div>
        <Announced {...announced.skipLink} />
      </Example>
      <Example title="Focusable wrapper" layout="column">
        <div>
          <VisuallyHidden focusable className={revealClass}>
            <Link href="#visually-hidden">{announced.wrapper.name}</Link>
          </VisuallyHidden>
        </div>
        <Announced {...announced.wrapper} />
      </Example>
    </>
  );
}

export const visuallyHiddenShowcase: Showcase = {
  id: "visually-hidden",
  name: "VisuallyHidden",
  exports: ["VisuallyHidden"],
  purpose: "Text that assistive technology announces but the page doesn't show.",
  Examples,
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
