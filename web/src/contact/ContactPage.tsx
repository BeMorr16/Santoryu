import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { contactContent } from "../content/contact.ts";
import { githubUrl, linkedinUrl } from "../site.config.ts";
import styles from "./Contact.module.css";

/** The contact page: heading, where the owner is based, the invitation, then the links (R2.1). */
export function ContactPage() {
  return (
    <Stack gap="md" className={styles.page}>
      <Typography as="h1" variant="display">
        {contactContent.heading}
      </Typography>
      <Typography variant="h3">{contactContent.location}</Typography>
      <Typography variant="lead" tone="muted" measure>
        {contactContent.invitation}
      </Typography>
      <Stack direction="horizontal" gap="sm" className={styles.links}>
        <Link href={linkedinUrl} appearance="button" variant="secondary" iconStart="linkedin">
          {contactContent.linkedinLabel}
        </Link>
        <Link href={githubUrl} appearance="button" variant="secondary" iconStart="github">
          {contactContent.githubLabel}
        </Link>
      </Stack>
    </Stack>
  );
}
