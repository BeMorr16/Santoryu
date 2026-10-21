import { Card } from "../../../components/Card/Card.tsx";
import { Grid, type GridOwnProps, type GridProps } from "../../../components/Grid/Grid.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { axisGap, gapDoc, layoutAsDoc } from "../shared-docs.ts";
import { GridExample } from "../examples/GridExample.tsx";
import gridExampleSource from "../examples/GridExample.tsx?raw";

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

/** The four projects in a Grid with this minimum column width. */
function MinGrid({ min }: { min: "sm" | "md" | "lg" }) {
  return (
    <Grid as="ul" min={min}>
      {cards(projects)}
    </Grid>
  );
}

function MinSmExample() {
  return <MinGrid min="sm" />;
}

function MinMdExample() {
  return <MinGrid min="md" />;
}

function MinLgExample() {
  return <MinGrid min="lg" />;
}

function NarrowContainerExample() {
  return (
    <Grid as="ul" min="md" className={styles.narrow}>
      {cards(projects.slice(0, 2))}
    </Grid>
  );
}

function RowAndColumnGapsExample() {
  return (
    <Grid as="ul" min="sm" rowGap="xs" columnGap="xl">
      {cards(projects)}
    </Grid>
  );
}

function FewItemsStretchedDefaultExample() {
  return (
    <Grid as="ul" min="md">
      {cards(projects.slice(0, 2))}
    </Grid>
  );
}

function FewItemsStretchFalseExample() {
  return (
    <Grid as="ul" min="md" stretch={false}>
      {cards(projects.slice(0, 2))}
    </Grid>
  );
}

function AtMostTwoColumnsExample() {
  return (
    <Grid as="ul" min="sm" maxColumns={2}>
      {cards(projects)}
    </Grid>
  );
}

function SemanticsExample() {
  return (
    <Grid as="fieldset" min="sm" gap="sm">
      <legend>Projects to show</legend>
      {projects.map((project, index) => (
        <label key={project}>
          <input type="checkbox" defaultChecked={index === 0} /> {project}
        </label>
      ))}
    </Grid>
  );
}

export const gridShowcase: Showcase = {
  id: "grid",
  exports: ["Grid"],
  purpose: "Responsive columns that fit their container, with no media queries.",
  main: { Example: GridExample, source: gridExampleSource, file: "GridExample.tsx" },
  examples: [
    { title: "min sm", layout: "column", Content: MinSmExample },
    { title: "min md", layout: "column", Content: MinMdExample },
    { title: "min lg", layout: "column", Content: MinLgExample },
    { title: "Narrow container", layout: "column", Content: NarrowContainerExample },
    { title: "Row and column gaps", layout: "column", Content: RowAndColumnGapsExample },
    {
      title: "Few items, stretched (default)",
      layout: "column",
      Content: FewItemsStretchedDefaultExample,
    },
    { title: "Few items, stretch={false}", layout: "column", Content: FewItemsStretchFalseExample },
    { title: "At most two columns", layout: "column", Content: AtMostTwoColumnsExample },
    { title: "Semantics", layout: "column", Content: SemanticsExample },
  ],
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
