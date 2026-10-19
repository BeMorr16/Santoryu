import { Card } from "../../../components/Card/Card.tsx";
import { Grid, type GridOwnProps, type GridProps } from "../../../components/Grid/Grid.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { axisGap, gapDoc, layoutAsDoc } from "./stack.tsx";

const props = {
  as: layoutAsDoc,
  min: {
    type: '"sm" | "md" | "lg"',
    default: '"md"',
    description: "Minimum column width (size.column.*): 12, 16 or 20rem.",
  },
  gap: gapDoc,
  rowGap: axisGap("Between rows (space.stack.*)."),
  columnGap: axisGap("Between columns (space.inline.*)."),
  stretch: {
    type: "boolean",
    default: "true",
    description:
      "With room for more columns than items, items stretch to fill the row (auto-fit). false keeps the empty columns (auto-fill).",
  },
  maxColumns: {
    type: "2 | 3 | 4",
    description:
      "At most this many columns. Columns still never get narrower than min, unless the container is.",
  },
} satisfies PropDocs<GridOwnProps & Pick<GridProps, "as">>;

const projects = ["Personal site", "Contact form", "View counter", "Component library"];

const cards = (names: string[]) =>
  names.map((name) => (
    <Card key={name} as="li" heading={name} headingLevel={4}>
      Placeholder description.
    </Card>
  ));

function Examples() {
  return (
    <>
      {(["sm", "md", "lg"] as const).map((min) => (
        <Example key={min} title={`min ${min}`} layout="column">
          <Grid as="ul" min={min}>
            {cards(projects)}
          </Grid>
        </Example>
      ))}
      <Example title="Narrow container" layout="column">
        <Grid as="ul" min="md" className={styles.narrow}>
          {cards(projects.slice(0, 2))}
        </Grid>
      </Example>
      <Example title="Row and column gaps" layout="column">
        <Grid as="ul" min="sm" rowGap="xs" columnGap="xl">
          {cards(projects)}
        </Grid>
      </Example>
      <Example title="Few items, stretched (default)" layout="column">
        <Grid as="ul" min="md">
          {cards(projects.slice(0, 2))}
        </Grid>
      </Example>
      <Example title="Few items, stretch={false}" layout="column">
        <Grid as="ul" min="md" stretch={false}>
          {cards(projects.slice(0, 2))}
        </Grid>
      </Example>
      <Example title="At most two columns" layout="column">
        <Grid as="ul" min="sm" maxColumns={2}>
          {cards(projects)}
        </Grid>
      </Example>
      <Example title="Semantics" layout="column">
        <Grid as="fieldset" min="sm" gap="sm">
          <legend>Projects to show</legend>
          {projects.map((project, index) => (
            <label key={project}>
              <input type="checkbox" defaultChecked={index === 0} /> {project}
            </label>
          ))}
        </Grid>
      </Example>
    </>
  );
}

export const gridShowcase: Showcase = {
  id: "grid",
  name: "Grid",
  exports: ["Grid"],
  purpose: "Responsive columns that fit their container, with no media queries.",
  Examples,
  props: [{ part: "Grid", docs: props }],
  propsNote:
    "Items in a row are as tall as the tallest one, so Card edges line up. maxColumns is a ceiling, not a count: a container too narrow for that many min-wide columns shows fewer.",
  tokens: null,
  tokensNote: "None. Column minimums and gaps are chosen by props from semantic scales.",
  a11y: [
    "Same element set and list handling as Stack.",
    "Narrower than one column, it shows a single full-width column with no horizontal scrolling.",
    "Grid never reorders items (no dense packing), so reading and focus order follow the source.",
    "As a fieldset, the legend still names the group and is spaced like the rows.",
  ],
};
