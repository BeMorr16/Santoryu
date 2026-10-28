import { Badge } from "../components/Badge/Badge.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { experienceContent, skills, type Highlight, type SkillId } from "../content/experience.ts";
import styles from "./Experience.module.css";
import type { Selection } from "./model.ts";

const labels: ReadonlyMap<SkillId, string> = new Map(
  skills.map((skill) => [skill.id, skill.label]),
);

/** One skill tag: accent with a check and spoken "selected" while selected (R5.4). */
function SkillTag({ id, selected }: { id: SkillId; selected: boolean }) {
  return selected ? (
    <Badge as="li" size="sm" variant="accent" icon="check">
      {labels.get(id)}
      <VisuallyHidden>, {experienceContent.selectedTag}</VisuallyHidden>
    </Badge>
  ) : (
    <Badge as="li" size="sm">
      {labels.get(id)}
    </Badge>
  );
}

/** One highlight: its title, summary, details, then its skills as tags (R4.5, R5). */
export function HighlightItem({
  highlight,
  selection,
}: {
  highlight: Highlight;
  selection: Selection;
}) {
  return (
    <Stack as="li" gap="sm" className={styles.highlight}>
      <Typography as="h4" variant="h5">
        {highlight.title}
      </Typography>
      <Typography>{highlight.summary}</Typography>
      <ul className={styles.details}>
        {highlight.details.map((detail) => (
          <Typography key={detail} as="li">
            {detail}
          </Typography>
        ))}
      </ul>
      <Stack as="ul" direction="horizontal" gap="xs" aria-label={experienceContent.tagListLabel}>
        {highlight.skills.map((id) => (
          <SkillTag key={id} id={id} selected={selection.has(id)} />
        ))}
      </Stack>
    </Stack>
  );
}
