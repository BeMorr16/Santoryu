import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent } from "../content/home.ts";
import { contactHref } from "../shell/nav.ts";
import { linkedinUrl } from "../site.config.ts";
import styles from "./Home.module.css";

/** A build-time constant, so the prerendered HTML and hydration agree (R2.4, R2.5). */
const showContact = contactHref !== "/";

/** Home's top: the name, the role, the intro and its focus areas, then the calls to action (R2). */
export function Hero() {
  return (
    <div className={styles.hero}>
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
      <Stack direction="horizontal" gap="sm" wrap className={styles.actions}>
        {showContact && (
          <Link href={contactHref} appearance="button" variant="primary" iconEnd="arrow-right">
            {homeContent.contactLabel}
          </Link>
        )}
        <Link href={linkedinUrl} appearance="button" variant="secondary" iconStart="linkedin">
          {homeContent.linkedinLabel}
        </Link>
      </Stack>
    </div>
  );
}
