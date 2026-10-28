import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { experienceContent, type Position } from "../content/experience.ts";
import styles from "./Experience.module.css";
import { HighlightItem } from "./HighlightItem.tsx";
import { formatYearMonth, matchesSelection, type Selection } from "./model.ts";

/** Start – end (or Present), then location and type where set, in the muted label look (R4.2). */
function PositionMeta({ position }: { position: Position }) {
  const extras = [
    position.location,
    position.type && experienceContent.types[position.type],
  ].filter((extra) => extra !== undefined);
  return (
    <Typography variant="label" tone="muted">
      <time dateTime={position.start}>{formatYearMonth(position.start)}</time>
      {" – "}
      {position.end === undefined ? (
        experienceContent.present
      ) : (
        <time dateTime={position.end}>{formatYearMonth(position.end)}</time>
      )}
      {extras.map((extra) => ` · ${extra}`).join("")}
    </Typography>
  );
}

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
  const matching = position.highlights.filter((highlight) =>
    matchesSelection(highlight, selection),
  );
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
        <PositionMeta position={position} />
      </Stack>
      {position.about !== undefined && (
        <Typography tone="muted" measure>
          {position.about}
        </Typography>
      )}
      {position.highlights.length > 0 &&
        (matching.length > 0 ? (
          <Stack as="ul" gap="lg">
            {matching.map((highlight) => (
              <HighlightItem key={highlight.id} highlight={highlight} selection={selection} />
            ))}
          </Stack>
        ) : (
          <Typography variant="small" tone="muted">
            {experienceContent.noMatch}
          </Typography>
        ))}
    </Stack>
  );
}
