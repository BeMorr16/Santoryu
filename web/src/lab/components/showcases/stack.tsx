import { Stack, type StackOwnProps, type StackProps } from "../../../components/Stack/Stack.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

export const layoutAsDoc = {
  type: '"div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main" | "ul" | "ol" | "li" | "form" | "fieldset"',
  default: '"div"',
  description: "The root element. Lists keep their semantics without markers.",
};

export const gapDoc = {
  type: '"none" | "xs" | "sm" | "md" | "lg" | "xl"',
  default: '"md"',
  description: "Vertical gaps use space.stack.*, horizontal ones space.inline.*.",
};

const props = {
  as: layoutAsDoc,
  direction: {
    type: '"vertical" | "horizontal"',
    default: '"vertical"',
    description: "No reverse directions, so reading order is visual order.",
  },
  gap: gapDoc,
  align: {
    type: '"start" | "center" | "end" | "stretch" | "baseline"',
    description: "Cross-axis alignment.",
  },
  justify: {
    type: '"start" | "center" | "end" | "between"',
    description: "Main-axis distribution.",
  },
  wrap: { type: "boolean", default: "false", description: "Wrap horizontal items onto new lines." },
} satisfies PropDocs<StackOwnProps & Pick<StackProps, "as">>;

const boxes = (labels: string[]) =>
  labels.map((label) => (
    <span key={label} className={styles.box}>
      {label}
    </span>
  ));

function Examples() {
  return (
    <>
      <Example title="Vertical (default), gaps none to xl">
        {(["none", "xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
          <Stack key={gap} gap={gap}>
            {boxes([`gap ${gap}`, "B"])}
          </Stack>
        ))}
      </Example>
      <Example title="Horizontal, gaps none to xl" layout="column">
        {(["none", "xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
          <Stack key={gap} direction="horizontal" gap={gap}>
            {boxes([`gap ${gap}`, "B", "C"])}
          </Stack>
        ))}
      </Example>
      <Example title="Align" layout="column">
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
      </Example>
      <Example title="Justify" layout="column">
        {(["start", "center", "end", "between"] as const).map((justify) => (
          <Stack key={justify} direction="horizontal" justify={justify} className={styles.frame}>
            {boxes([`justify ${justify}`, "B"])}
          </Stack>
        ))}
      </Example>
      <Example title="Wrapping list" layout="column">
        <Stack as="ul" direction="horizontal" gap="sm" wrap className={styles.narrow}>
          {["React", "TypeScript", "AWS CDK", "Vite", "Playwright", "CloudFront"].map((item) => (
            <li key={item} className={styles.box}>
              {item}
            </li>
          ))}
        </Stack>
      </Example>
    </>
  );
}

export const stackShowcase: Showcase = {
  id: "stack",
  name: "Stack",
  exports: ["Stack"],
  purpose: "Vertical or horizontal flow with gaps from the spacing scale.",
  Examples,
  props: [{ part: "Stack", docs: props }],
  tokens: null,
  tokensNote: "None. Every value is chosen by a prop from a semantic scale.",
  a11y: [
    "A div by default, or any element from a closed set (section, nav, ul, ol, form…).",
    'As ul or ol, markers go but list semantics stay (role="list" is restated for Safari).',
    "Spacing uses gap only, and DOM order is visual order.",
  ],
};
