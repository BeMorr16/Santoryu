import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { experienceContent, type Position } from "../content/experience.ts";
import { EntryHighlights } from "./EntryHighlights.tsx";
import { EntryMeta } from "./EntryMeta.tsx";
import styles from "./Experience.module.css";
import type { Selection } from "./model.ts";

/**
 * One position: the stacked title and company h3, its dates, its about line, then its matching
 * highlights, or the no-match line when it has highlights but none match (R4, R7.3).
 */
export function PositionEntry({
  position,
  selection,
}: {
  position: Position;
  selection: Selection;
}) {
  const extras = [
    position.location,
    position.type && experienceContent.types[position.type],
  ].filter((extra) => extra !== undefined);
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Typography as="h3">
          {position.title}
          <VisuallyHidden>,</VisuallyHidden>{" "}
          <Typography as="span" variant="body" className={styles.company}>
            {position.company}
          </Typography>
        </Typography>
        <EntryMeta start={position.start} end={position.end} extras={extras} />
      </Stack>
      {position.about !== undefined && (
        <Typography tone="muted" measure>
          {position.about}
        </Typography>
      )}
      <EntryHighlights highlights={position.highlights} selection={selection} />
    </Stack>
  );
}
