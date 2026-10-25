import type { ComponentType } from "react";
import { Card } from "../../components/Card/Card.tsx";
import { Grid } from "../../components/Grid/Grid.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { hubCards, type HubCardId } from "./cards.ts";
import { ComponentsPreview } from "./ComponentsPreview.tsx";
import { cardCounts } from "./counts.ts";
import { ThemeCreatorPreview } from "./ThemeCreatorPreview.tsx";
import { TokensPreview } from "./TokensPreview.tsx";

const previews: Record<HubCardId, ComponentType> = {
  tokens: TokensPreview,
  components: ComponentsPreview,
  "theme-creator": ThemeCreatorPreview,
};

/** The /design-system hub: a lead, then one link card per part (ds-hub R1, R2). */
export function HubPage() {
  return (
    <>
      <h1>Design System</h1>
      <Typography variant="lead" tone="muted">
        The system this site is built from: tokens that set every color, size and motion, components
        built on them, and a theme creator that edits both.
      </Typography>
      <Grid as="ul" min="sm" maxColumns={3} gap="md">
        {hubCards.map(({ id, href, title, description }) => {
          const Preview = previews[id];
          return (
            <Card
              key={id}
              as="li"
              href={href}
              heading={title}
              headingLevel={2}
              media={<Preview />}
              footer={cardCounts[id]}
              subgrid
            >
              {description}
            </Card>
          );
        })}
      </Grid>
    </>
  );
}
