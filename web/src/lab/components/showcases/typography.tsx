import {
  Typography,
  type TypographyOwnProps,
  type TypographyProps,
} from "../../../components/Typography/Typography.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const props = {
  as: {
    type: '"p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "label" | "legend" | "strong" | "em" | "small" | "mark" | "s" | "code" | "kbd" | "samp" | "abbr" | "cite" | "q" | "time" | "blockquote" | "figcaption" | "caption" | "li" | "dt" | "dd"',
    default: '"p"',
    description: "The element, and so the heading level and role.",
  },
  variant: {
    type: '"display" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "lead" | "body" | "small" | "label" | "code" | "inherit"',
    default: "from the element",
    description: "The look only: family, size, weight, line height and tracking.",
  },
  tone: {
    type: '"default" | "muted" | "subtle" | "accent" | "accent-2" | "success" | "warning" | "error"',
    default: "inherited",
    description: "Text color, each from its own component token.",
  },
  measure: {
    type: "boolean",
    default: "false",
    description: "Caps the line length at about 65 characters.",
  },
} satisfies PropDocs<TypographyOwnProps & Pick<TypographyProps, "as">>;

/** The customized example's CSS, shown under it and applied by `.customLabel`. */
export const customLabelCss = `.customLabel {
  --component-typography-label-tracking: var(--type-tracking-body);
  --component-typography-label-font-family: var(--type-family-body);
}`;

/** The type scale, every variant except `inherit`, each named by its own text (refinement R12.13). */
export const scale = [
  { variant: "display", text: "Display, 48px" },
  { variant: "h1", text: "Heading 1, 40px" },
  { variant: "h2", text: "Heading 2, 32px" },
  { variant: "h3", text: "Heading 3, 24px" },
  { variant: "h4", text: "Heading 4, 20px" },
  { variant: "h5", text: "Heading 5, 16px" },
  { variant: "h6", text: "Heading 6, 14px" },
  { variant: "lead", text: "Lead, 20px" },
  { variant: "body", text: "Body, 16px" },
  { variant: "small", text: "Small, 14px" },
  { variant: "label", text: "Label, 12px" },
  { variant: "code", text: "Code, inherits size" },
] as const;

export const tones = [
  { tone: "default", text: "Default" },
  { tone: "muted", text: "Muted" },
  { tone: "subtle", text: "Subtle" },
  { tone: "accent", text: "Accent" },
  { tone: "accent-2", text: "Accent 2" },
  { tone: "success", text: "Success: saved" },
  { tone: "warning", text: "Warning: unsaved changes" },
  { tone: "error", text: "Error: the email is missing" },
] as const;

const measured =
  "A comfortable line holds about 45 to 75 characters, so the eye finds the start of the next line without effort. Longer lines tire readers, and shorter ones break the rhythm of reading. The measure caps this paragraph at about 65 characters, whatever its size.";

function Examples() {
  return (
    <>
      <Example title="Type scale" layout="column">
        {scale.map(({ variant, text }) => (
          <Typography key={variant} variant={variant}>
            {text}
          </Typography>
        ))}
      </Example>
      <Example title="Level and look are separate" layout="column">
        <Typography as="h4" variant="h2">
          An h4 with the h2 look
        </Typography>
        <Typography as="h5" variant="label">
          An h5 with the label look
        </Typography>
      </Example>
      <Example title="Look from the element" layout="column">
        <Typography as="h4">An h4, with the h4 look</Typography>
        <Typography as="code">A code element, with the code look</Typography>
        <Typography as="small">A small element, with the small look</Typography>
        <Typography variant="lead">
          Lead text with <Typography as="strong">strong text</Typography> inside, at the lead&apos;s
          size
        </Typography>
      </Example>
      <Example title="Tones" layout="column">
        {tones.map(({ tone, text }) => (
          <Typography key={tone} tone={tone}>
            {text}
          </Typography>
        ))}
      </Example>
      <Example title="Measure" layout="column">
        <Typography measure>With measure: {measured}</Typography>
        <Typography>Without measure: {measured}</Typography>
      </Example>
      <Example title="Inline text" layout="column">
        <Typography>
          Press <Typography as="kbd">Tab</Typography> to reach{" "}
          <Typography as="code">main</Typography>. Web Content Accessibility Guidelines (
          <Typography as="abbr" title="Web Content Accessibility Guidelines">
            WCAG
          </Typography>
          ) 2.2 was published on{" "}
          <Typography as="time" dateTime="2023-10-05">
            5 October 2023
          </Typography>
          . Its reflow criterion asks for content{" "}
          <Typography as="q">without loss of information or functionality</Typography>.
        </Typography>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <Typography variant="label" className={styles.customLabel}>
          Custom label
        </Typography>
        <pre className={styles.code}>
          <code>{customLabelCss}</code>
        </pre>
      </Example>
    </>
  );
}

export const typographyShowcase: Showcase = {
  id: "typography",
  name: "Typography",
  exports: ["Typography"],
  purpose: "Text in one of the type scale's looks, with the heading level chosen separately.",
  Examples,
  props: [{ part: "Typography", docs: props }],
  propsNote:
    "Without variant, the look comes from the element: h1–h6 take the variant of the same name; code, kbd and samp take code; small takes small; span, strong, em, mark, s, abbr, cite, q and time take inherit; every other element takes body. An explicit variant wins. The heading level, and so the role, comes only from as. inherit and code set no size, so on h1–h6 the plain heading's size for that level shows through.",
  tokens: "typography",
  a11y: [
    "The level comes from as and the look from variant, so keep the page outline logical whatever the size.",
    "success, warning and error carry meaning, so the wording must state the status on its own (WCAG 1.4.1); the color is an extra.",
    "On glass, use only the default or muted tone: the others aren't contrast-checked there.",
    "Don't set tone on text inside a Link, or on mark: those pairings aren't contrast-checked, and a recolored link may lose what sets it apart.",
    "The label look's uppercase is CSS only, so write the source text in normal case: some screen readers spell out words typed in capitals.",
    "abbr's title isn't reliably announced or shown, so spell the abbreviation out on first use.",
    "Sizes are in rem, so text follows the browser's text size and zoom.",
    "Long words break instead of overflowing in block layout, so nothing scrolls sideways at 320 CSS px (WCAG 1.4.10). In a flex or grid item, also let it shrink (min-inline-size: 0).",
  ],
};
