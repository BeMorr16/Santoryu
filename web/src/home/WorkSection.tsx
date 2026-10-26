import { Badge } from "../components/Badge/Badge.tsx";
import { Card } from "../components/Card/Card.tsx";
import { Grid } from "../components/Grid/Grid.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent, workCards, type WorkCard } from "../content/home.ts";
import styles from "./Home.module.css";

/** A link card, or a placeholder (no link, nothing focusable) when the page doesn't exist yet (R3.3, R3.4). */
function WorkCardItem({ card }: { card: WorkCard }) {
  return card.href === undefined ? (
    <Card as="li" variant="glass" heading={card.title} subgrid>
      <Badge size="sm">{homeContent.placeholderBadge}</Badge>
      <p>{card.description}</p>
    </Card>
  ) : (
    <Card as="li" variant="glass" href={card.href} heading={card.title} subgrid>
      {card.description}
    </Card>
  );
}

/** "What I build": one card per entry in workCards (R3). */
export function WorkSection() {
  return (
    <section aria-labelledby="home-work" className={styles.section}>
      <Typography as="h2" id="home-work">
        {homeContent.workHeading}
      </Typography>
      <Grid as="ul" min="sm" maxColumns={3} gap="md" className={styles.workGrid}>
        {workCards.map((card) => (
          <WorkCardItem key={card.id} card={card} />
        ))}
      </Grid>
    </section>
  );
}
