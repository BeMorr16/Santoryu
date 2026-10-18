import { Card } from "../../../components/Card/Card.tsx";
import { Grid, type GridOwnProps, type GridProps } from "../../../components/Grid/Grid.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { gapDoc, layoutAsDoc } from "./stack.tsx";

const props = {
  as: layoutAsDoc,
  min: {
    type: '"sm" | "md" | "lg"',
    default: '"md"',
    description: "Minimum column width (size.column.*): 12, 16 or 20rem.",
  },
  gap: gapDoc,
} satisfies PropDocs<GridOwnProps & Pick<GridProps, "as">>;

const projects = ["Personal site", "Contact form", "View counter", "Component library"];

function Examples() {
  return (
    <>
      {(["sm", "md", "lg"] as const).map((min) => (
        <Example
          key={min}
          title={`min ${min}, gap ${({ sm: "xs", md: "md", lg: "xl" } as const)[min]}`}
          layout="column"
        >
          <Grid as="ul" min={min} gap={({ sm: "xs", md: "md", lg: "xl" } as const)[min]}>
            {projects.map((project) => (
              <Card key={project} as="li" heading={project} headingLevel={4}>
                Placeholder description.
              </Card>
            ))}
          </Grid>
        </Example>
      ))}
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
  tokens: null,
  tokensNote: "None. Column minimums and gaps are chosen by props from semantic scales.",
  a11y: [
    "Same element set and list handling as Stack.",
    "Narrower than one column, it shows a single full-width column with no horizontal scrolling.",
  ],
};
