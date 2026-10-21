import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Separator, type SeparatorOwnProps } from "../../../components/Separator/Separator.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

/** `children` is typed `never` (no children allowed), so the propsNote covers it, not a row. */
const separatorDocs = {
  orientation: {
    type: '"horizontal" | "vertical"',
    default: '"horizontal"',
    description:
      "Horizontal spans its container and goes in a vertical flow (block flow or a vertical Stack). Vertical goes in a horizontal flow (a horizontal Stack), where it fills the height of its row; elsewhere it's one line tall. A semantic vertical separator says its orientation.",
  },
  decorative: {
    type: "boolean",
    default: "false",
    description:
      "Renders an empty div hidden from assistive technology instead of an hr. Use it where headings, lists or landmarks already mark the break, or where it only divides items in a row.",
  },
  variant: {
    type: '"subtle" | "strong"',
    default: '"subtle"',
    description:
      "subtle is decorative and not contrast-checked. strong is checked to 3:1 against every surface, for a line that is the only thing showing a grouping.",
  },
  thickness: {
    type: '"thin" | "thick"',
    default: '"thin"',
    description:
      "thin is the border width (1px), thick twice that (2px). Thickness is only a look: a thick line doesn't mark a bigger break for assistive technology.",
  },
} satisfies PropDocs<Omit<SeparatorOwnProps, "children">>;

/** The Vertical example's byline: a date, a reading time and a topic. */
export const byline = {
  date: "21 Oct 2026",
  dateTime: "2026-10-21",
  items: ["5 min read", "Design"],
} as const;

/** The customized example's CSS, shown beside the separator it restyles and applied by `.customSeparator`. */
export const customSeparatorCss = `.customSeparator {
  --component-separator-subtle-color: var(--color-accent-border);
}`;

function Examples() {
  return (
    <>
      <Example title="Horizontal" layout="column">
        <Stack>
          <p>The lab shows every component with live examples, its props and its tokens.</p>
          <Separator />
          <p>The site itself is prerendered to static pages and served from the edge.</p>
        </Stack>
        <p>
          A semantic separator is an <code>&lt;hr&gt;</code>. It has the separator role, so screen
          readers can announce the break.
        </p>
      </Example>
      <Example title="Vertical" layout="column">
        <Stack direction="horizontal" gap="sm" align="center">
          <time dateTime={byline.dateTime}>{byline.date}</time>
          {byline.items.flatMap((item) => [
            <Separator key={`${item}-separator`} orientation="vertical" decorative />,
            <span key={item}>{item}</span>,
          ])}
        </Stack>
        <p>
          Decorative separators are hidden from assistive technology. These only divide items in a
          row.
        </p>
      </Example>
      <Example title="Variants" layout="column">
        <Stack>
          <p>Subtle (default)</p>
          <Separator decorative />
          <p>Strong</p>
          <Separator decorative variant="strong" />
        </Stack>
      </Example>
      <Example title="Thickness" layout="column">
        <Stack>
          <p>Thin (default)</p>
          <Separator decorative />
          <p>Thick</p>
          <Separator decorative thickness="thick" />
        </Stack>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <Stack>
          <p>One topic ends here.</p>
          <Separator className={styles.customSeparator} />
          <p>Another one starts.</p>
        </Stack>
        <CodeBlock label="CSS" language="css">
          {customSeparatorCss}
        </CodeBlock>
      </Example>
    </>
  );
}

export const separatorShowcase: Showcase = {
  id: "separator",
  name: "Separator",
  exports: ["Separator"],
  purpose: "A themed horizontal or vertical rule, announced as a break or purely decorative.",
  Examples,
  props: [{ part: "Separator", docs: separatorDocs }],
  propsNote:
    "There are no children. role, aria-orientation and aria-hidden come from decorative and orientation, and there's no tabIndex: it's never focusable. className and native props reach the hr or, when decorative, the div. There's no margin, so the parent's gap spaces it. Neither the hr nor the decorative div can sit inside a p, heading, button or label; use a Stack div, as in the Vertical example. A ul or ol holds only li, so divide list items with their own borders, not a Separator.",
  tokens: "separator",
  a11y: [
    "Semantic by default: an <hr>, with the separator role. Keep it for a thematic break, such as a change of topic in prose or the end of a group of content. Make it decorative where headings, lists or landmarks already mark the break, or where it only divides items in a row.",
    "Never focusable: a focusable separator is a splitter, which resizes the panes on each side, and this one doesn't.",
    "A semantic vertical separator has aria-orientation=\"vertical\". Horizontal is the role's default, so it isn't set.",
    "subtle lines aren't contrast-checked, since nothing depends on seeing them. strong is checked to 3:1 against every surface, for a line that is the only thing showing a grouping.",
    "In forced colors the line takes a system color, so both variants look the same.",
    "In a wrapping row, a line can start with a vertical separator. Decorative ones aren't announced, so it only affects the look.",
  ],
};
