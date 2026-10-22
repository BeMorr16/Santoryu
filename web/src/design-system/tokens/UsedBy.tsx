import { listRole } from "../../components/shared/layout.ts";
import styles from "../TableContent.module.css";
import { TokenLink } from "./TokenLink.tsx";

/**
 * The semantic tokens aliasing a primitive, each linking to its row, or "Not used" (ds-tokens R5.2).
 * `showLabel` shows "Used by" where no column header says it, as in the color ramps.
 */
export function UsedBy({
  tokens,
  showLabel = false,
}: {
  tokens: readonly string[];
  showLabel?: boolean;
}) {
  if (tokens.length === 0) return <span className={styles.ref}>Not used</span>;
  const list = (
    <ul className={styles.refs} aria-label="Used by" {...listRole("ul", undefined)}>
      {tokens.map((token) => (
        <li key={token}>
          <TokenLink token={token} />
        </li>
      ))}
    </ul>
  );
  if (!showLabel) return list;
  return (
    <>
      <span className={styles.ref} aria-hidden="true">
        Used by
      </span>
      {list}
    </>
  );
}
