import { Button } from "../../../components/Button/Button.tsx";
import { Link } from "../../../components/Link/Link.tsx";
import { Stack, type StackOwnProps, type StackProps } from "../../../components/Stack/Stack.tsx";
import type { PropDocs } from "../PropDocs.ts";
import { axisGap, gapDoc, layoutAsDoc } from "../shared-docs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { StackExample } from "../examples/StackExample.tsx";
import stackExampleSource from "../examples/StackExample.tsx?raw";

const props = {
  as: layoutAsDoc,
  direction: {
    type: '"vertical" | "horizontal"',
    default: '"vertical"',
    description: "No reverse directions, so reading order is visual order.",
  },
  gap: gapDoc,
  rowGap: axisGap(
    "Between rows (space.stack.*): items in a vertical Stack, wrapped lines in a horizontal one.",
  ),
  columnGap: axisGap(
    "Between columns (space.inline.*): items in a horizontal Stack, wrapped columns in a vertical one.",
  ),
  align: {
    type: '"start" | "center" | "end" | "stretch" | "baseline"',
    description: "Cross-axis alignment.",
  },
  justify: {
    type: '"start" | "center" | "end" | "between"',
    description: "Main-axis distribution.",
  },
  wrap: {
    type: "boolean",
    default: "true when horizontal",
    description: "Wrap items onto new lines. wrap={false} keeps a horizontal Stack on one line.",
  },
} satisfies PropDocs<StackOwnProps & Pick<StackProps, "as">>;

const tech = ["React", "TypeScript", "AWS CDK", "Vite", "Playwright", "CloudFront"];

const techList = (gaps: Pick<StackOwnProps, "gap" | "rowGap">) => (
  <Stack as="ul" direction="horizontal" {...gaps} className={styles.narrow}>
    {tech.map((item) => (
      <li key={item} className={styles.box}>
        {item}
      </li>
    ))}
  </Stack>
);

const boxes = (labels: string[]) =>
  labels.map((label) => (
    <span key={label} className={styles.box}>
      {label}
    </span>
  ));

function VerticalDefaultGapsNoneToXlExample() {
  return (
    <>
      {(["none", "xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
        <Stack key={gap} gap={gap}>
          {boxes([`gap ${gap}`, "B"])}
        </Stack>
      ))}
    </>
  );
}

function HorizontalGapsNoneToXlExample() {
  return (
    <>
      {(["none", "xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
        <Stack key={gap} direction="horizontal" gap={gap}>
          {boxes([`gap ${gap}`, "B", "C"])}
        </Stack>
      ))}
    </>
  );
}

function AlignExample() {
  return (
    <>
      {(["start", "center", "end", "stretch", "baseline"] as const).map((align) => (
        <Stack key={align} direction="horizontal" align={align} className={styles.frame}>
          <span className={styles.box}>align {align}</span>
          <span className={styles.box}>
            Two
            <br />
            lines
          </span>
        </Stack>
      ))}
    </>
  );
}

function JustifyExample() {
  return (
    <>
      {(["start", "center", "end", "between"] as const).map((justify) => (
        <Stack key={justify} direction="horizontal" justify={justify} className={styles.frame}>
          {boxes([`justify ${justify}`, "B"])}
        </Stack>
      ))}
    </>
  );
}

function VerticalAlignmentExample() {
  return (
    <>
      <Stack className={styles.frame}>
        <Button>Stretched (default)</Button>
      </Stack>
      <Stack align="start" className={styles.frame}>
        <Button>align start</Button>
      </Stack>
    </>
  );
}

function WrappingByDefaultExample() {
  return <>{techList({ gap: "sm" })}</>;
}

function OneLineExample() {
  return (
    <Stack
      direction="horizontal"
      wrap={false}
      justify="between"
      align="center"
      className={styles.frame}
    >
      <span>Project</span>
      <Button size="sm">Edit project</Button>
    </Stack>
  );
}

function RowAndColumnGapsExample() {
  return <>{techList({ gap: "md", rowGap: "xs" })}</>;
}

function SemanticsExample() {
  return (
    <>
      <Stack as="ul" direction="horizontal" aria-label="Design System pages (example)">
        <li>
          <Link href="/design-system">Design System</Link>
        </li>
        <li>
          <Link href="/design-system/tokens">Tokens</Link>
        </li>
        <li>
          <Link href="/design-system/components">Components</Link>
        </li>
      </Stack>
      <Stack as="fieldset" gap="sm">
        <legend>Contact preference</legend>
        <label>
          <input type="radio" name="stack-contact" value="email" defaultChecked /> Email
        </label>
        <label>
          <input type="radio" name="stack-contact" value="phone" /> Phone
        </label>
      </Stack>
    </>
  );
}

export const stackShowcase: Showcase = {
  id: "stack",
  exports: ["Stack"],
  purpose: "Vertical or horizontal flow with gaps from the spacing scale.",
  main: { Example: StackExample, source: stackExampleSource, file: "StackExample.tsx" },
  examples: [
    { title: "Vertical (default), gaps none to xl", Content: VerticalDefaultGapsNoneToXlExample },
    {
      title: "Horizontal, gaps none to xl",
      layout: "column",
      Content: HorizontalGapsNoneToXlExample,
    },
    { title: "Align", layout: "column", Content: AlignExample },
    { title: "Justify", layout: "column", Content: JustifyExample },
    { title: "Vertical alignment", layout: "column", Content: VerticalAlignmentExample },
    { title: "Wrapping by default", layout: "column", Content: WrappingByDefaultExample },
    { title: "One line", layout: "column", Content: OneLineExample },
    { title: "Row and column gaps", layout: "column", Content: RowAndColumnGapsExample },
    { title: "Semantics", layout: "column", Content: SemanticsExample },
  ],
  props: [{ part: "Stack", docs: props }],
  propsNote:
    "A vertical Stack stretches its children across its width, so an inline-level child such as a Button spans the full width unless align is set. baseline aligns only in horizontal Stacks. justify and a vertical wrap need a block size.",
  tokens: null,
  tokensNote: "None. Every value is chosen by a prop from a semantic scale.",
  a11y: [
    "A div by default, or any element from a closed set (section, nav, ul, ol, form…).",
    'As ul or ol, markers go but list semantics stay (role="list" is restated for Safari).',
    "Spacing uses gap only, and DOM order is visual order.",
    "Horizontal Stacks wrap by default, so rows reflow at narrow widths and high zoom (WCAG 1.4.10).",
    "As a fieldset, the legend is still the group's name and is spaced like the other items.",
  ],
};
