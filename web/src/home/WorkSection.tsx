import { Card } from "../components/Card/Card.tsx";
import { Grid } from "../components/Grid/Grid.tsx";
import { cx } from "../components/shared/cx.ts";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent, workCards, type WorkCard } from "../content/home.ts";
import page from "../shell/page.module.css";
import styles from "./Home.module.css";

/** A link card, named by its title (R3.3). */
function WorkCardItem({ card }: { card: WorkCard }) {
  return (
    <Card as="li" variant="glass" href={card.href} heading={card.title} subgrid>
      {card.description}
    </Card>
  );
}

/** "What I build": one card per entry in workCards (R3). */
export function WorkSection() {
  return (
    <section aria-labelledby="home-work" className={cx(page.column, styles.section)}>
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
