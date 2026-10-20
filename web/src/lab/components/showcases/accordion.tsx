import { useState } from "react";
import {
  Accordion,
  AccordionItem,
  type AccordionItemOwnProps,
  type AccordionOwnProps,
} from "../../../components/Accordion/Accordion.tsx";
import { Badge } from "../../../components/Badge/Badge.tsx";
import { Button } from "../../../components/Button/Button.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const accordionDocs = {
  headingLevel: {
    type: "2 | 3 | 4 | 5 | 6",
    default: "3",
    description: "Every item's heading level. Choose it from the page outline.",
  },
  headingVariant: {
    type: "TypographyVariant",
    default: '"h4"',
    description: "Every item's heading look, the same at every level.",
  },
  exclusive: {
    type: "boolean",
    default: "false",
    description: "Opening an item closes the others.",
  },
  region: {
    type: "boolean",
    default: "false",
    description: "Makes each panel a region named by its heading. Only for six or fewer panels.",
  },
} satisfies PropDocs<AccordionOwnProps>;

const itemDocs = {
  heading: {
    type: "ReactNode",
    description: "Required. The heading's content, inside its button. No links or buttons.",
  },
  open: { type: "boolean", description: "Controlled open state; pair with onOpenChange." },
  defaultOpen: { type: "boolean", default: "false", description: "Uncontrolled initial state." },
  onOpenChange: {
    type: "(open: boolean) => void",
    description:
      "Called on every requested open or close, controlled or not, including an exclusive group closing it and find-in-page opening it.",
  },
} satisfies PropDocs<AccordionItemOwnProps>;

export const accordionKeyboard: readonly KeyboardRow[] = [
  { keys: "Tab / Shift+Tab", action: "Moves between headings' buttons and into open panels." },
  { keys: "Enter / Space", action: "Opens or closes the item." },
  {
    keys: "Arrow keys",
    action: "Scroll the page, as usual; there's no movement between headings.",
  },
];

/** The customized example's CSS, shown under it and applied by `.customAccordion`. */
export const customAccordionCss = `.customAccordion {
  --component-accordion-border: var(--color-border-strong);
  --component-accordion-trigger-padding-inline: var(--space-inset-md);
  --component-accordion-panel-padding-inline: var(--space-inset-md);
}`;

/** The Find in page answer: it appears nowhere else on the page, so the first match is in the panel. */
export const findWord = "dogs";
export const findCaption =
  "It's raining cats and ____. Search this page for the missing word: the item opens to show the match.";

/** The Rich heading example's heading, and its caption built from the same strings. */
export const richHeading = { text: "Release notes", badge: "Live" } as const;
export const richHeadingAnnounced = (open: boolean) => ({
  name: `${richHeading.text} ${richHeading.badge}`,
  role: `heading level 4, button, ${open ? "expanded" : "collapsed"}`,
});

const siteItems = [
  {
    heading: "What is this site?",
    body: "A personal site that doubles as a showcase for its own component library.",
  },
  {
    heading: "How is it built?",
    body: "React and TypeScript, prerendered to static HTML and served from AWS. Every look value comes from a design token.",
  },
  {
    heading: "Can I reuse the components?",
    body: "They're built for this site, but the source is open: read it, borrow the patterns.",
  },
] as const;

function SiteItems({ firstOpen = false }: { firstOpen?: boolean }) {
  return siteItems.map(({ heading, body }, index) => (
    <AccordionItem key={heading} heading={heading} defaultOpen={firstOpen && index === 0}>
      <p>{body}</p>
    </AccordionItem>
  ));
}

function Examples() {
  const [open, setOpen] = useState(false);
  const [richOpen, setRichOpen] = useState(false);
  return (
    <>
      <Example title="Independent items" layout="column">
        <Accordion headingLevel={4}>
          <SiteItems firstOpen />
        </Accordion>
      </Example>
      <Example title="Exclusive" layout="column">
        <Accordion headingLevel={4} exclusive>
          <SiteItems />
        </Accordion>
      </Example>
      <Example title="Controlled" layout="column">
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? "Close" : "Open"}
          </Button>
        </div>
        <Accordion headingLevel={4}>
          <AccordionItem heading="Shipping details" open={open} onOpenChange={setOpen}>
            <p>Opened and closed from outside, or by its own button.</p>
          </AccordionItem>
        </Accordion>
        <p aria-live="polite">The item is {open ? "open" : "closed"}.</p>
      </Example>
      <Example title="Rich heading" layout="column">
        <Accordion headingLevel={4}>
          <AccordionItem
            open={richOpen}
            onOpenChange={setRichOpen}
            heading={
              <>
                {richHeading.text}{" "}
                <Badge variant="success" icon="check">
                  {richHeading.badge}
                </Badge>
              </>
            }
          >
            <p>The badge's icon is decorative; its text is part of the button's name.</p>
          </AccordionItem>
        </Accordion>
        <Announced {...richHeadingAnnounced(richOpen)} />
      </Example>
      <Example title="Find in page" layout="column">
        <Accordion headingLevel={4}>
          <AccordionItem heading="A hidden answer">
            <p>
              The missing word is <strong id="accordion-find-word">{findWord}</strong>.
            </p>
          </AccordionItem>
        </Accordion>
        <p>{findCaption}</p>
      </Example>
      <Example title="Regions" layout="column">
        <Accordion headingLevel={4} region>
          <AccordionItem heading="Delivery">
            <p>Orders ship within two working days.</p>
          </AccordionItem>
          <AccordionItem heading="Returns">
            <p>Return anything within thirty days.</p>
          </AccordionItem>
        </Accordion>
        <p>Each open panel is announced as a region named by its heading.</p>
      </Example>
      <Example title="Heading look" layout="column">
        <Accordion headingLevel={4} headingVariant="body">
          <SiteItems />
        </Accordion>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <Accordion headingLevel={4} className={styles.customAccordion}>
          <AccordionItem heading="Custom">
            <p>A strong line and wider padding.</p>
          </AccordionItem>
        </Accordion>
        <pre className={styles.code}>
          <code>{customAccordionCss}</code>
        </pre>
      </Example>
    </>
  );
}

export const accordionShowcase: Showcase = {
  id: "accordion",
  name: "Accordion",
  exports: ["Accordion", "AccordionItem"],
  purpose: "Headings that open and close a panel of content each, so long content can fold away.",
  Examples,
  props: [
    { part: "Accordion", docs: accordionDocs },
    { part: "AccordionItem", docs: itemDocs },
  ],
  propsNote:
    "An item's children are its panel. heading must not hold links or buttons: the whole heading is one button. An AccordionItem works alone, with level 3 and the h4 look. With exclusive, items opened together on first render stay open until one opens. Use region only for six or fewer panels.",
  tokens: "accordion",
  keyboard: accordionKeyboard,
  a11y: [
    "Each item is a heading holding one button, so the headings stay in the page outline: choose headingLevel to fit it.",
    "The button announces whether it's expanded (aria-expanded) and points to its panel (aria-controls).",
    'A closed panel is out of the Tab order and the accessibility tree, yet find-in-page and links to its content open it (hidden="until-found", in browsers that support it).',
    "No arrow keys move between headings, so arrows keep scrolling the page; Tab reaches every button.",
    "With region, each panel is a region named by its heading. More than about six regions clutter the landmarks list, so it's off by default.",
    "The height and chevron animate over component.accordion.transition-duration, 0ms under reduced motion.",
    "In forced colors, the lines, chevron and focus ring use system colors, and the hover background is dropped.",
  ],
};
