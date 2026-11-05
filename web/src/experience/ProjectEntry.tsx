import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, type Project } from "../content/experience.ts";
import { EntryHighlights } from "./EntryHighlights.tsx";
import { EntryMeta } from "./EntryMeta.tsx";
import type { Selection } from "./model.ts";

/**
 * One project: its name h3, dates and kind, its about line, its links, then its matching
 * highlights, or the no-match line (experience-skills R2, R3.1–R3.3). A filter never hides the
 * header, about line or links.
 */
export function ProjectEntry({ project, selection }: { project: Project; selection: Selection }) {
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Typography as="h3">{project.name}</Typography>
        <EntryMeta
          start={project.start}
          end={project.end}
          extras={[experienceContent.projectKind]}
        />
      </Stack>
      <Typography tone="muted" measure>
        {project.about}
      </Typography>
      {/* Same tab: a /path routes client-side, anything else is a plain link (R2.5, R2.6). */}
      <Stack
        as="ul"
        direction="horizontal"
        gap="sm"
        aria-label={experienceContent.projectLinksLabel}
      >
        {project.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              appearance="button"
              variant="secondary"
              size="sm"
              iconStart={link.icon}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </Stack>
      <EntryHighlights highlights={project.highlights} selection={selection} />
    </Stack>
  );
}
