import { Card } from "../components/Card/Card.tsx";
import { Grid } from "../components/Grid/Grid.tsx";
import { cx } from "../components/shared/cx.ts";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent, principles } from "../content/home.ts";
import page from "../shell/page.module.css";
import styles from "./Home.module.css";

/**
 * "How I develop": one glass card per principle (R4). The example sits in the footer, so the
 * "In practice" blocks line up across a row (R5.2).
 */
export function PrinciplesSection() {
  return (
    <section aria-labelledby="home-principles" className={cx(page.column, styles.section)}>
      <Typography as="h2" id="home-principles">
        {homeContent.principlesHeading}
      </Typography>
      <Grid as="ul" min="sm" maxColumns={3} gap="md">
        {principles.map((principle) => (
          <Card
            key={principle.id}
            as="li"
            variant="glass"
            heading={principle.name}
            subgrid
            footer={
              <>
                <Typography variant="label" tone="muted" className={styles.exampleLabel}>
                  {homeContent.exampleLabel}
                </Typography>
                <p>{principle.example}</p>
              </>
            }
          >
            <p>{principle.description}</p>
          </Card>
        ))}
      </Grid>
    </section>
  );
}
