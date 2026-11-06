import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, type Highlight } from "../content/experience.ts";
import { HighlightItem } from "./HighlightItem.tsx";
import { matchesSelection, type Selection } from "./model.ts";

/**
 * The highlights the selection matches, or the no-match line; nothing for an entry with none
 * (R4.4, R7.3; experience-skills R3.2, R3.3).
 */
export function EntryHighlights({
  highlights,
  selection,
}: {
  highlights: readonly Highlight[];
  selection: Selection;
}) {
  if (highlights.length === 0) return null;
  const matching = highlights.filter((highlight) => matchesSelection(highlight, selection));
  return matching.length > 0 ? (
    <Stack as="ul" gap="lg">
      {matching.map((highlight) => (
        <HighlightItem key={highlight.id} highlight={highlight} selection={selection} />
      ))}
    </Stack>
  ) : (
    <Typography variant="small" tone="muted">
      {experienceContent.noMatch}
    </Typography>
  );
}
