import { Badge, type BadgeOwnProps, type BadgeProps } from "../../../components/Badge/Badge.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const props = {
  as: { type: '"span" | "li"', default: '"span"', description: "The root element." },
  variant: {
    type: '"neutral" | "accent" | "accent-2" | "success" | "warning" | "error"',
    default: '"neutral"',
    description:
      "neutral, accent and accent-2 are emphasis only; success, warning and error carry meaning.",
  },
  size: { type: '"sm" | "md"', default: '"md"', description: "Text size and padding." },
  icon: { type: "IconName", description: "Decorative icon before the text." },
} satisfies PropDocs<BadgeOwnProps & Pick<BadgeProps, "as">>;

/** The customized example's CSS, shown under it and applied by `.customBadge`. */
export const customBadgeCss = `.customBadge {
  --component-badge-neutral-border: var(--color-border-strong);
  --component-badge-padding-inline-md: var(--space-inline-md);
}`;

const variants = [
  { variant: "neutral", text: "Neutral" },
  { variant: "accent", text: "Accent" },
  { variant: "accent-2", text: "Accent 2" },
  { variant: "success", text: "Live" },
  { variant: "warning", text: "Beta" },
  { variant: "error", text: "Deprecated" },
] as const;

function Examples() {
  return (
    <>
      <Example title="Variants">
        {variants.map(({ variant, text }) => (
          <Badge key={variant} variant={variant}>
            {text}
          </Badge>
        ))}
      </Example>
      <Example title="Sizes">
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
      </Example>
      <Example title="With an icon">
        <Badge variant="success" icon="check">
          Live
        </Badge>
        <Badge icon="github">Open source</Badge>
      </Example>
      <Example title="A tech stack, as a list">
        <Stack as="ul" direction="horizontal" gap="xs" aria-label="Tech stack">
          {["React", "TypeScript", "AWS"].map((item) => (
            <Badge key={item} as="li">
              {item}
            </Badge>
          ))}
        </Stack>
      </Example>
      <Example title="In running text, with inline markup" layout="column">
        <p>
          This site is <Badge variant="success">Live</Badge> and{" "}
          <Badge>
            Built with <em>Vite</em>
          </Badge>
          .
        </p>
      </Example>
      <Example title="Wraps instead of overflowing">
        <div className={styles.narrow}>
          <Badge>Infrastructure as code</Badge>
        </div>
        <div className={styles.narrow}>
          <Badge>Internationalization</Badge>
        </div>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <div>
          <Badge className={styles.customBadge}>Custom</Badge>
        </div>
        <pre className={styles.code}>
          <code>{customBadgeCss}</code>
        </pre>
      </Example>
    </>
  );
}

export const badgeShowcase: Showcase = {
  id: "badge",
  name: "Badge",
  exports: ["Badge"],
  purpose: "A short, non-interactive label, such as one item of a tech stack or a status.",
  Examples,
  props: [{ part: "Badge", docs: props }],
  propsNote:
    "A status badge's wording must state the status on its own. Inside a list, use as=\"li\". Icon names come from Icon's registry. Its type matches Typography's label look: the same family and tracking tokens.",
  tokens: "badge",
  a11y: [
    "Plain text in a span or li: not focusable, no pointer cursor, no hover state.",
    "neutral, accent and accent-2 are emphasis only: the choice between them must not carry information, so color alone is fine. success, warning and error carry meaning, so the wording must state the status on its own (WCAG 1.4.1); the color and any icon are extras.",
    "The icon is decorative and hidden from screen readers.",
    "The uppercase is CSS only, so write the source text in normal case: copy and paste, reader modes and some browsers keep it. Other browsers pass the capitals on to screen readers, so avoid short words that read as acronyms.",
    "Badges wrap rather than overflow at narrow widths and high zoom (WCAG 1.4.10).",
  ],
};
