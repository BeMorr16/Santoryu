import { CodeBlock, type CodeBlockOwnProps } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Announced } from "../Announced.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { CodeBlockExample } from "../examples/CodeBlockExample.tsx";
import codeBlockExampleSource from "../examples/CodeBlockExample.tsx?raw";

const codeBlockDocs = {
  label: {
    type: "ReactNode",
    description:
      "Required. What the code is: a language, a file name or a purpose. Shown in the header, and names the block while it scrolls. No interactive content.",
  },
  children: {
    type: "string",
    description:
      "Required. The code, as plain text. One line break is trimmed at each end; everything else, indentation included, is kept.",
  },
  language: {
    type: "string",
    description: 'Sets class="language-<language>" on the code. There\'s no highlighting.',
  },
  wrap: {
    type: "boolean",
    default: "false",
    description:
      "Wraps long lines at the edge instead of scrolling, breaking inside a word only where it would overflow. A wrapped block is never a Tab stop.",
  },
  copy: {
    type: "boolean",
    default: "true",
    description: 'Shows the "Copy code" button at the end of the header.',
  },
  lineNumbers: {
    type: "boolean",
    default: "true",
    description:
      "Numbers each line in a gutter at the start, which stays put while the code scrolls. A wrapped line keeps one number. Decorative: never copied, selected or announced.",
  },
} satisfies PropDocs<CodeBlockOwnProps>;

export const codeBlockKeyboard: readonly KeyboardRow[] = [
  {
    keys: "Tab / Shift+Tab",
    action: "Moves to the copy button, then to the code while it's too wide to fit.",
  },
  { keys: "← / →", action: "Scrolls the focused code sideways." },
  { keys: "Enter / Space", action: "On the copy button, copies the code." },
];

/** The Basic, Without copy and Without line numbers examples' code. */
export const basicCss = `.card {
  padding: var(--space-inset-md);
  border-radius: var(--radius-surface);
}`;

/** The Long lines and Wrapped examples: wider than the panel at most window widths. */
export const longLines = [
  {
    label: "Terminal",
    language: "sh",
    lineNumbers: false,
    code: "pnpm --filter web exec vitest run src/components/CodeBlock src/components/Typography src/components/types.test.tsx --reporter=verbose --coverage.enabled=false",
  },
  {
    label: "TypeScript",
    language: "ts",
    lineNumbers: true,
    code: `import type { ComponentPropsWithRef } from "react";

export type CodeBlockProps = CodeBlockOwnProps & Omit<ComponentPropsWithRef<"div">, keyof CodeBlockOwnProps>; // every native div prop reaches the root element`,
  },
] as const;

/** The customized example's CSS, shown in the block it restyles and applied by `.customCodeBlock`. */
export const customCodeBlockCss = `.customCodeBlock {
  --component-code-block-border: var(--color-accent-border);
  --component-code-block-label-color: var(--color-accent-text);
}`;

function BasicExample() {
  return (
    <CodeBlock label="CSS" language="css">
      {basicCss}
    </CodeBlock>
  );
}

function LongLinesExample() {
  return (
    <>
      {longLines.map(({ label, language, lineNumbers, code }) => (
        <CodeBlock key={label} label={label} language={language} lineNumbers={lineNumbers}>
          {code}
        </CodeBlock>
      ))}
      <p>
        Lines too wide for the panel scroll inside the block. While one scrolls, it&apos;s a Tab
        stop:
      </p>
      <Announced name={longLines[0].label} role="group" />
    </>
  );
}

function WrappedExample() {
  return (
    <>
      {longLines.map(({ label, language, lineNumbers, code }) => (
        <CodeBlock key={label} label={label} language={language} lineNumbers={lineNumbers} wrap>
          {code}
        </CodeBlock>
      ))}
    </>
  );
}

function WithoutCopyExample() {
  return (
    <CodeBlock label="CSS" language="css" copy={false}>
      {basicCss}
    </CodeBlock>
  );
}

function WithoutLineNumbersExample() {
  return (
    <CodeBlock label="CSS" language="css" lineNumbers={false}>
      {basicCss}
    </CodeBlock>
  );
}

function CustomizedWithComponentTokensExample() {
  return (
    <CodeBlock label="CSS" language="css" className={styles.customCodeBlock}>
      {customCodeBlockCss}
    </CodeBlock>
  );
}

export const codeBlockShowcase: Showcase = {
  id: "code-block",
  exports: ["CodeBlock"],
  purpose: "A labelled, copyable code sample whose long lines scroll inside it.",
  main: { Example: CodeBlockExample, source: codeBlockExampleSource, file: "CodeBlockExample.tsx" },
  examples: [
    { title: "Basic", layout: "column", Content: BasicExample },
    { title: "Long lines", layout: "column", Content: LongLinesExample },
    { title: "Wrapped", layout: "column", Content: WrappedExample },
    { title: "Without copy", layout: "column", Content: WithoutCopyExample },
    { title: "Without line numbers", layout: "column", Content: WithoutLineNumbersExample },
    {
      title: "Customized with component tokens",
      layout: "column",
      Content: CustomizedWithComponentTokensExample,
    },
  ],
  props: [{ part: "CodeBlock", docs: codeBlockDocs }],
  propsNote:
    "children is plain text, trimmed by one line break at each end. label holds no links or buttons. There's no syntax highlighting: language only sets the code's class. className and native props reach the root div.",
  tokens: "code-block",
  keyboard: codeBlockKeyboard,
  a11y: [
    "The label comes first in reading order, so screen-reader users hear what the code is before it. While the code scrolls, the label also names its focusable group.",
    "While its lines are too wide to fit, the code is a focusable group named by the label, so a keyboard can scroll it. Safari doesn't make scrolling boxes focusable on its own. Once it fits, it's no longer a Tab stop. Before the page's script runs, every block without wrap is one.",
    "It's a group, not a region, so a page of code samples doesn't fill the landmarks list.",
    "Use wrap for prose-like samples, where scrolling would hide the ends of sentences.",
    "Line numbers are decorative: they're generated by CSS with empty alternative text (content: counter(line) / \"\"), so they're never announced, selected or copied. Mention a line by its content, not its number, in text that relies on them.",
    'Copying says "Copied" through a polite status message, and the icon shows a check, for 2 seconds. If the clipboard refuses, the message says "Couldn\'t copy", shown beside the button as well, with a warning icon. The button\'s name stays "Copy code", so it isn\'t announced again.',
    'Every copy button is named "Copy code"; each follows its block\'s label in reading order, and its name shows as a tooltip.',
    "In forced colors, the border, the header line and the focus ring keep system colors.",
  ],
};
