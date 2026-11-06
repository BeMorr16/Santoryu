import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, type YearMonth } from "../content/experience.ts";
import { formatYearMonth } from "./model.ts";

/**
 * Start – end (or Present), then each extra after a middle dot, in the muted label look
 * (R4.2; experience-skills R2.2).
 */
export function EntryMeta({
  start,
  end,
  extras,
}: {
  start: YearMonth;
  end?: YearMonth | undefined;
  extras: readonly string[];
}) {
  return (
    <Typography variant="label" tone="muted">
      <time dateTime={start}>{formatYearMonth(start)}</time>
      {" – "}
      {end === undefined ? (
        experienceContent.present
      ) : (
        <time dateTime={end}>{formatYearMonth(end)}</time>
      )}
      {extras.map((extra) => ` · ${extra}`).join("")}
    </Typography>
  );
}
