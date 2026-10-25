import { CopyButton } from "../../components/shared/CopyButton.tsx";
import { TableCell, TableHeaderCell } from "../../components/Table/Table.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import type { TokenMeta } from "../../tokens/types.ts";
import styles from "../TableContent.module.css";

/** The copy column's header: visually hidden, but there, so the column isn't unnamed. */
export function CopyHeaderCell() {
  return (
    <TableHeaderCell>
      <VisuallyHidden>Copy</VisuallyHidden>
    </TableHeaderCell>
  );
}

/**
 * A row's button copying its CSS variable (ds-tokens R8.2). In its own cell, so the row header a
 * screen reader repeats along the row is just the variable.
 */
export function CopyCell({ token }: { token: TokenMeta }) {
  return (
    <TableCell>
      <CopyButton
        text={token.cssVar}
        label={`Copy ${token.cssVar}`}
        className={styles.copy}
        failureClassName={styles.failure}
      />
    </TableCell>
  );
}
