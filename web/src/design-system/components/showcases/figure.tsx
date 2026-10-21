import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import {
  Figure,
  type FigureAltProps,
  type FigureOwnProps,
} from "../../../components/Figure/Figure.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { elkPhoto, fallsPhoto, missingImageSrc } from "./figure-photos.ts";
import elk1280 from "../images/bull-elk-1280.jpg";
import elk1920 from "../images/bull-elk-1920.jpg";
import elk640 from "../images/bull-elk-640.jpg";
import falls1440 from "../images/lower-falls-1440.jpg";
import falls480 from "../images/lower-falls-480.jpg";
import falls960 from "../images/lower-falls-960.jpg";
import { FigureExample } from "../examples/FigureExample.tsx";
import figureExampleSource from "../examples/FigureExample.tsx?raw";

/** `children` is typed `never` (no children allowed), so the propsNote covers it, not a row. */
const figureDocs = {
  alt: {
    type: "string",
    description:
      "What the image shows or does. Required unless decorative; a literal empty string is a type error, so use decorative instead.",
  },
  decorative: {
    type: "true",
    description:
      'Renders alt="", so assistive technology skips the image. Use it where nearby text already says everything the image shows. Pass alt or decorative, never both.',
  },
  caption: {
    type: "ReactNode",
    description:
      "Rendered as the figcaption, right below the image, as small muted text that wraps at the image's width. It names the figure.",
  },
  src: { type: "string", description: "The image file, and the fallback when srcSet is set." },
  srcSet: {
    type: "string",
    description:
      "Other widths of the same image (e.g. `photo-640.jpg 640w`), for the browser to pick from.",
  },
  sizes: {
    type: "string",
    description:
      "How wide the image shows at each window size, so the browser picks the right file from srcSet.",
  },
  width: {
    type: "number",
    description:
      "The image's intrinsic width in pixels (not the displayed width). With height, it reserves the box before the image loads.",
  },
  height: {
    type: "number",
    description: "The image's intrinsic height in pixels (not the displayed height).",
  },
  loading: {
    type: '"lazy" | "eager"',
    default: '"lazy"',
    description: 'The image in view when the page loads takes "eager".',
  },
  decoding: {
    type: '"async" | "sync" | "auto"',
    default: '"async"',
    description: "When the browser decodes the image.",
  },
  fetchPriority: {
    type: '"high" | "low" | "auto"',
    description: 'The image in view when the page loads (the largest one) takes "high".',
  },
  crossOrigin: {
    type: '"anonymous" | "use-credentials" | ""',
    description: "For an image from another origin that's read by script.",
  },
  referrerPolicy: {
    type: "HTMLAttributeReferrerPolicy",
    description: "The img element's referrerpolicy.",
  },
} satisfies PropDocs<Omit<FigureOwnProps, "children"> & FigureAltProps>;

/** The landscape photo: its text and sizes from figure-photos.ts, its files from the build. */
export const elk = {
  ...elkPhoto,
  src: elk1920,
  srcSet: `${elk640} 640w, ${elk1280} 1280w, ${elk1920} 1920w`,
} as const;

/** The portrait photo: its text and sizes from figure-photos.ts, its files from the build. */
export const falls = {
  ...fallsPhoto,
  src: falls1440,
  srcSet: `${falls480} 480w, ${falls960} 960w, ${falls1440} 1440w`,
} as const;

/** The customized example's CSS, shown beside the figure it restyles and applied by `.customFigure`. */
export const customFigureCss = `.customFigure {
  --component-figure-image-max-block-size: var(--size-column-md);
  --component-figure-caption-gap: var(--space-stack-sm);
}`;

const { caption: elkCaption, ...elkImage } = elk;
const { caption: fallsCaption, ...fallsImage } = falls;

function InformativeWithACaptionExample() {
  return (
    <>
      <Figure {...elkImage} caption={elkCaption} />
      <p>
        The figure is named by its caption. The alt text says what the image shows, and the caption
        adds what it doesn&apos;t.
      </p>
    </>
  );
}

function TallImageExample() {
  return (
    <>
      <Figure {...fallsImage} caption={fallsCaption} />
      <p>
        Capped at 80% of the window&apos;s height, keeping its shape. The caption wraps at the
        image&apos;s width.
      </p>
    </>
  );
}

function FailedToLoadExample() {
  return (
    <>
      <Figure
        src={missingImageSrc}
        width={elk.width}
        height={elk.height}
        alt={elk.alt}
        caption="This file is missing."
      />
      <p>
        When an image fails to load, screen readers still read its alt text, and browsers show it
        where it fits.
      </p>
    </>
  );
}

function DecorativeExample() {
  return (
    <>
      <Stack>
        <p>
          A bull elk stands side-on in a mown field by a road, a white two-story building behind it.
        </p>
        <Figure
          src={elk.src}
          srcSet={elk.srcSet}
          sizes={elk.sizes}
          width={elk.width}
          height={elk.height}
          decorative
        />
      </Stack>
      <p>
        The paragraph already says what the photo shows, so the image is decorative: it has{" "}
        <code>alt=&quot;&quot;</code>, and screen readers skip it.
      </p>
    </>
  );
}

function CustomizedWithComponentTokensExample() {
  return (
    <>
      <Figure {...elkImage} caption={elkCaption} className={styles.customFigure} />
      <CodeBlock label="CSS" language="css">
        {customFigureCss}
      </CodeBlock>
    </>
  );
}

export const figureShowcase: Showcase = {
  id: "figure",
  exports: ["Figure"],
  purpose: "A responsive content image with an optional caption, described or skipped on purpose.",
  main: { Example: FigureExample, source: figureExampleSource, file: "FigureExample.tsx" },
  examples: [
    {
      title: "Informative with a caption",
      layout: "column",
      Content: InformativeWithACaptionExample,
    },
    { title: "Tall image", layout: "column", Content: TallImageExample },
    { title: "Failed to load", layout: "column", Content: FailedToLoadExample },
    { title: "Decorative", layout: "column", Content: DecorativeExample },
    {
      title: "Customized with component tokens",
      layout: "column",
      Content: CustomizedWithComponentTokensExample,
    },
  ],
  props: [{ part: "Figure", docs: figureDocs }],
  propsNote:
    "There are no children. Pass exactly one of alt or decorative, and a literal alt=\"\" is a type error: use decorative. width and height are required and are the image's intrinsic pixel size, not the displayed one. className, other native props and ref reach the figure. There's no margin, so the parent's gap spaces it.",
  tokens: "figure",
  a11y: [
    "Alt text says what the image shows or does, in a sentence or two. Don't start with \"image of\", and don't repeat the caption: the caption adds context.",
    'Use decorative where nearby text already says everything the image shows, or the image is only ornament. It renders alt="", so screen readers skip it, and with no caption the figure itself is hidden (role="none"), so nothing empty is announced.',
    "A caption names the figure, so screen readers announce it with the figure. Without one, the figure has no name.",
    "A chart, diagram or screenshot with detail needs a full description in its caption or the text next to it; alt text alone is too short.",
    "If an image fails to load, screen readers still read its alt text, and browsers show it where it fits.",
    "Tall images are capped at 80% of the window's height, so the whole image is in view without scrolling.",
    'The image in view when the page loads takes loading="eager" and fetchPriority="high"; others load lazily as they scroll near.',
  ],
};
