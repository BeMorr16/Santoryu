import type { ComponentType } from "react";
import { Card } from "../../components/Card/Card.tsx";
import { Grid } from "../../components/Grid/Grid.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import page from "../../shell/page.module.css";
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

/** How the system was built, in the owner's words (2026-10-30). */
export const buildNote =
  "Built alongside agentic coding. Most components were ported from libraries and projects I built before; for the rest, I provided the direction, specs and designs, and then reviewed the result. Every component was integrated with this site's tokens, so all of them are fully customizable. The docs were written by AI and verified by automated tests and accessibility checks.";

/** The /design-system hub: a lead, a note on how it was built, then one link card per part (ds-hub R1, R2). */
export function HubPage() {
  return (
    <Stack gap="lg" className={page.wideColumn}>
      <h1>Design System</h1>
      <Typography variant="lead" tone="muted">
        The system this site is built from: tokens that set every property value (color, size and
        motion), components built on them, and a theme creator that edits both.
      </Typography>
      <Typography variant="small" tone="muted">
        {buildNote}
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
    </Stack>
  );
}
