import { TextField } from "../../components/TextField/TextField.tsx";
import { searchSection } from "./reference-ids.ts";
import styles from "./TokenSearch.module.css";
import { useSettled } from "./use-settled.ts";

/** How long typing must pause before the result count is announced (§9.3). */
export const settleMs = 400;

function resultMessage(query: string, count: number | null): string {
  if (count === null) return "";
  if (count === 0) return `No tokens match “${query.trim()}”`;
  return count === 1 ? "1 token matches" : `${String(count)} tokens match`;
}

/**
 * The reference's search field and its result count, in a search landmark named by its h2
 * (ds-tokens R11.1, R11.4). The count is visible text and a polite status at once, shown once
 * typing settles.
 */
export function TokenSearch({
  query,
  resultQuery,
  count,
  onQueryChange,
}: {
  query: string;
  /** The query the count is for: the results follow typing a render behind. */
  resultQuery: string;
  /** Matching tokens, or null with no query. */
  count: number | null;
  onQueryChange: (query: string) => void;
}) {
  const message = useSettled(resultMessage(resultQuery, count), settleMs);
  return (
    <search aria-labelledby={searchSection.id} className={styles.search}>
      <h2 id={searchSection.id}>{searchSection.label}</h2>
      <div className={styles.field}>
        <TextField
          type="search"
          label="Search tokens"
          hint="Name, variable, value or description"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
        />
        <p role="status" className={styles.status}>
          {message}
        </p>
      </div>
    </search>
  );
}
