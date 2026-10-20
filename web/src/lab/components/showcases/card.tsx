import { Badge } from "../../../components/Badge/Badge.tsx";
import { Button } from "../../../components/Button/Button.tsx";
import { Card, type CardOwnProps, type CardProps } from "../../../components/Card/Card.tsx";
import { Grid } from "../../../components/Grid/Grid.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const props = {
  as: {
    type: '"article" | "section" | "div" | "li"',
    default: '"article"',
    description: "The root element.",
  },
  heading: { type: "ReactNode", description: "The card's title. Required when href is set." },
  headingLevel: {
    type: "2 | 3 | 4 | 5 | 6",
    default: "3",
    description:
      "Fits the card into the page's heading outline. The look comes from headingVariant.",
  },
  headingVariant: {
    type: '"display" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "lead" | "body" | "small" | "label" | "code" | "inherit"',
    default: '"h4"',
    description:
      'The heading\'s Typography look, the same at every heading level, except "inherit" and "code", which keep the plain heading\'s size for its level.',
  },
  variant: {
    type: '"raised" | "outlined" | "flat" | "glass"',
    default: '"raised"',
    description: "Surface look, each from its own component tokens.",
  },
  footer: { type: "ReactNode", description: "Bottom part, at the card's bottom edge." },
  subgrid: {
    type: "boolean",
    default: "false",
    description: "In a Grid, parts line up across the row.",
  },
  href: {
    type: "string",
    description: "Makes the heading the card's link, and the whole card clickable.",
  },
  newTab: { type: "boolean", default: "false", description: "With href: open in a new tab." },
} satisfies PropDocs<CardOwnProps & Pick<CardProps, "as">>;

/** The customized example's CSS, shown under it and applied by `.accentCard`. */
export const accentCardCss = `.accentCard {
  --component-card-raised-border: var(--color-accent-border);
  --component-card-padding: var(--space-inset-md);
}`;

const variants = [
  { variant: "raised", heading: "Raised", body: "A raised surface with a soft shadow." },
  { variant: "outlined", heading: "Outlined", body: "A strong outline, with no fill or shadow." },
  { variant: "flat", heading: "Flat", body: "A sunken fill, with no outline or shadow." },
  { variant: "glass", heading: "Glass", body: "Translucent and blurred, over a varied backdrop." },
] as const;

const headingLevels = [
  { level: 4, announced: { name: "Project notes", role: "heading level 4" } },
  { level: 5, announced: { name: "Release notes", role: "heading level 5" } },
] as const;

const headingLooks = [
  { variant: "h3", heading: "Featured project", body: "A larger heading, with h3's look." },
  { variant: "label", heading: "Case study", body: "A kicker-style heading, with the label look." },
] as const;

const projects = [
  { heading: "Contact form", body: "Sends me a message.", status: "Planned" },
  {
    heading: "View counter",
    wrapping: "View counter, with a count for every page",
    body: "Counts visits to each page. Its backend comes later.",
    status: "Planned",
  },
  {
    heading: "Component library",
    body: "Built on design tokens. Every component is keyboard accessible. Each one has its own section here.",
    status: "In progress",
  },
];

const projectCards = (subgrid: boolean) =>
  projects.map((project) => (
    <Card
      key={project.heading}
      as="li"
      heading={subgrid ? (project.wrapping ?? project.heading) : project.heading}
      headingLevel={4}
      subgrid={subgrid}
      footer={<Badge>{project.status}</Badge>}
    >
      {project.body}
    </Card>
  ));

function Examples() {
  return (
    <>
      <Example title="Variants" layout="column">
        <div className={styles.glassBackdrop}>
          <Grid min="sm" gap="sm">
            {variants.map(({ variant, heading, body }) => (
              <Card
                key={variant}
                heading={heading}
                headingLevel={4}
                variant={variant}
                href="/lab/tokens"
              >
                {body}
              </Card>
            ))}
          </Grid>
        </div>
      </Example>
      <Example title="Parts" layout="column">
        <Card
          heading="Static hosting"
          headingLevel={4}
          footer={
            <Stack as="ul" direction="horizontal" gap="xs" aria-label="Services">
              <Badge as="li">S3</Badge>
              <Badge as="li">CloudFront</Badge>
            </Stack>
          }
        >
          S3 and CloudFront, deployed from GitHub Actions.
        </Card>
      </Example>
      <Example title="Linked, with a nested control" layout="column">
        <Grid min="sm" gap="sm">
          <Card heading="Design tokens" headingLevel={4} href="/lab/tokens">
            Every color, size and motion value, with light and dark themes.
          </Card>
          <Card
            heading="Source on GitHub"
            headingLevel={4}
            href="https://github.com/"
            newTab
            footer={
              <Button size="sm" iconStart="check">
                Star (example)
              </Button>
            }
          >
            The whole site is public.
          </Card>
        </Grid>
      </Example>
      <Example title="Footers line up" layout="column">
        <Grid as="ul" min="sm">
          {projectCards(false)}
        </Grid>
      </Example>
      <Example title="Subgrid" layout="column">
        <Grid as="ul" min="sm">
          {projectCards(true)}
        </Grid>
      </Example>
      <Example title="Any heading level" layout="column">
        <Grid min="sm" gap="sm">
          {headingLevels.map(({ level, announced }) => (
            <Card key={level} heading={announced.name} headingLevel={level}>
              <Announced {...announced} />
            </Card>
          ))}
        </Grid>
      </Example>
      <Example title="Heading look" layout="column">
        <Grid min="sm" gap="sm">
          {headingLooks.map(({ variant, heading, body }) => (
            <Card key={variant} heading={heading} headingLevel={4} headingVariant={variant}>
              {body}
            </Card>
          ))}
        </Grid>
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <Card heading="Accent outline" headingLevel={4} className={styles.accentCard}>
          An accent border and tighter padding, set through Card&apos;s component tokens.
        </Card>
        <pre className={styles.code}>
          <code>{accentCardCss}</code>
        </pre>
      </Example>
    </>
  );
}

export const cardShowcase: Showcase = {
  id: "card",
  name: "Card",
  exports: ["Card"],
  purpose: "A surface for grouped content that can link somewhere as a whole.",
  Examples,
  props: [{ part: "Card", docs: props }],
  propsNote:
    "subgrid works only when the Card is a direct child of a Grid. For several footer items, use a horizontal Stack. Glass needs a varied backdrop behind it. On a link card, aria-current goes to its heading link.",
  tokens: "card",
  keyboard: [
    {
      keys: "Tab",
      action: "Focuses the heading link (the ring surrounds the card), then any controls inside.",
    },
    { keys: "Enter", action: "Follows the card's link." },
  ],
  a11y: [
    "An article by default, or section, div or li.",
    "A link card has one link: its heading, named by the heading text alone (plus “, opens in new tab” with newTab).",
    "The whole surface is clickable for pointers; nested controls keep their own clicks and focus.",
    "A link card is never marked aria-current automatically, even on the page it links to. A caller's aria-current goes to its heading link.",
    "The heading's look comes from headingVariant and is the same at every level (except with inherit or code), so choose headingLevel by the page outline.",
    "Text inside a link card can't be selected, because the link's overlay covers it.",
    "The hover look shows only where a click follows the link: not over nested controls, and not on touch screens.",
    "Glass turns opaque when reduced transparency is requested.",
    "Backdrops, for text contrast: raised and flat work on any surface. Outlined is transparent, so use it only on surface.base, raised or sunken. Glass needs a varied backdrop made only of those surfaces and action.background.",
    "A link card's focus ring is drawn on the backdrop around the card, so keep link cards of every variant off action.background: there the ring is the same color in light, and nearly so in dark.",
  ],
};
