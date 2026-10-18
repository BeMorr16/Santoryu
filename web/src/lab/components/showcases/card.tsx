import { Button } from "../../../components/Button/Button.tsx";
import { Card, type CardOwnProps, type CardProps } from "../../../components/Card/Card.tsx";
import { Grid } from "../../../components/Grid/Grid.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";

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
    description: "Fits the card into the page's heading outline.",
  },
  href: {
    type: "string",
    description: "Makes the heading the card's link, and the whole card clickable.",
  },
  newTab: { type: "boolean", default: "false", description: "With href: open in a new tab." },
} satisfies PropDocs<CardOwnProps & Pick<CardProps, "as">>;

function Examples() {
  return (
    <Example title="Plain, linked, and linked with a nested control" layout="column">
      <Grid min="sm" gap="sm">
        <Card heading="Static hosting" headingLevel={4}>
          S3 and CloudFront, deployed from GitHub Actions.
        </Card>
        <Card heading="Design tokens" headingLevel={4} href="/lab/tokens">
          Every color, size and motion value, with light and dark themes.
        </Card>
        <Card heading="Source on GitHub" headingLevel={4} href="https://github.com/" newTab>
          <p>The whole site is public.</p>
          <Button size="sm" iconStart="check">
            Star (example)
          </Button>
        </Card>
      </Grid>
    </Example>
  );
}

export const cardShowcase: Showcase = {
  id: "card",
  name: "Card",
  exports: ["Card"],
  purpose: "A surface for grouped content that can link somewhere as a whole.",
  Examples,
  props: [{ part: "Card", docs: props }],
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
    "A link card has one link: its heading, named by the heading text alone (plus “(opens in new tab)” with newTab).",
    "The whole surface is clickable for pointers; nested controls keep their own clicks and focus.",
  ],
};
