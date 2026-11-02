import { Icon } from "../components/Icon/Icon.tsx";
import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { footerContent } from "../content/footer.ts";
import { githubUrl, linkedinUrl, resumePdfPath } from "../site.config.ts";
import { navLinks } from "./nav.ts";
import styles from "./SiteFooter.module.css";

/**
 * The site footer (site-footer design §4): the personal column and the footer navigation, then the
 * built-with note. Links mark the current page themselves.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        {/* start: the name link stays as wide as its text, not the column. */}
        <Stack gap="sm" align="start">
          <Link href="/" underline="hover" aria-label={footerContent.homeLabel}>
            {footerContent.name}
          </Link>
          <Typography variant="small" tone="muted">
            {footerContent.role}
          </Typography>
          <Typography variant="small" tone="muted">
            {footerContent.location}
          </Typography>
          <Stack direction="horizontal" gap="xs">
            <Link
              href={linkedinUrl}
              appearance="button"
              variant="ghost"
              size="sm"
              iconStart="linkedin"
              aria-label={footerContent.linkedinLabel}
            />
            <Link
              href={githubUrl}
              appearance="button"
              variant="ghost"
              size="sm"
              iconStart="github"
              aria-label={footerContent.githubLabel}
            />
          </Stack>
        </Stack>
        <Stack as="nav" gap="sm" aria-label={footerContent.navLabel}>
          <Typography as="h2" variant="label">
            {footerContent.navHeading}
          </Typography>
          <Stack as="ul" gap="xs">
            <li>
              <Link href="/" underline="hover">
                {footerContent.homeLink}
              </Link>
            </li>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} currentMatch={link.currentMatch} underline="hover">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {/* reloadDocument: a routed path would render the 404 page instead of downloading. */}
              <Link href={resumePdfPath} underline="hover" download reloadDocument>
                <Icon name="download" className={styles.linkIcon} />
                {footerContent.resumeLink}
              </Link>
            </li>
          </Stack>
        </Stack>
      </div>
      <Typography variant="small" tone="muted">
        {footerContent.builtWith}
      </Typography>
    </footer>
  );
}
