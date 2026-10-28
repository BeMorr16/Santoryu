import { Link } from "../components/Link/Link.tsx";
import { cx } from "../components/shared/cx.ts";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent } from "../content/home.ts";
import { contactHref } from "../shell/nav.ts";
import page from "../shell/page.module.css";
import styles from "./Home.module.css";

/** Home's top: the name, the role, the intro and its focus areas, then the calls to action (R2). */
export function Hero() {
  return (
    <div className={cx(page.column, styles.hero)}>
      <Typography as="h1" variant="display">
        {homeContent.name}
      </Typography>
      <Typography variant="h3">{homeContent.role}</Typography>
      <Typography variant="lead" tone="muted" measure>
        {homeContent.intro}
      </Typography>
      <ul className={styles.focusAreas}>
        {homeContent.focusAreas.map((area) => (
          <Typography key={area} as="li" variant="lead" tone="muted">
            {area}
          </Typography>
        ))}
      </ul>
      <Stack direction="horizontal" gap="sm" wrap className={page.actions}>
        <Link href={contactHref} appearance="button" variant="primary" iconEnd="arrow-right">
          {homeContent.contactLabel}
        </Link>
      </Stack>
    </div>
  );
}
