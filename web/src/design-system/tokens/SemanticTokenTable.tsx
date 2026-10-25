import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/Table/Table.tsx";
import type { SemanticTokenMeta, TokenValue } from "../../tokens/types.ts";
import { Specimen } from "../Specimen.tsx";
import styles from "../TableContent.module.css";
import { CopyCell, CopyHeaderCell } from "./CopyCell.tsx";
import { tokenRowId } from "./reference-ids.ts";
import { TokenLink } from "./TokenLink.tsx";

function Value({ value, reduced }: { value: TokenValue; reduced?: TokenValue | undefined }) {
  return (
    <>
      <code className={styles.value}>{value.css}</code>
      <span className={styles.ref}>
        from <TokenLink token={value.ref} />
      </span>
      {reduced && (
        <span className={styles.ref}>
          Reduced motion: <code>{reduced.css}</code> from <TokenLink token={reduced.ref} />
        </span>
      )}
    </>
  );
}

/** One category's semantic tokens, under a group heading that names it, so the caption is hidden (ds-tokens R6.1). */
export function SemanticTokenTable({
  caption,
  tokens,
  shown,
}: {
  caption: string;
  tokens: readonly SemanticTokenMeta[];
  /** Search results: rows outside it are hidden (R11.3). */
  shown?: ReadonlySet<string> | null | undefined;
}) {
  const themed = tokens.some((token) => token.themed);
  return (
    <Table caption={caption} hideCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <CopyHeaderCell />
          <TableHeaderCell>Description</TableHeaderCell>
          {themed ? (
            <>
              <TableHeaderCell>Light</TableHeaderCell>
              <TableHeaderCell>Dark</TableHeaderCell>
            </>
          ) : (
            <TableHeaderCell>Value</TableHeaderCell>
          )}
          <TableHeaderCell>Preview</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {tokens.map((token) => {
          const id = tokenRowId(token.name);
          return (
            <TableRow
              key={token.name}
              id={id}
              className={styles.target}
              hidden={shown?.has(id) === false}
            >
              <TableHeaderCell>
                <code className={styles.name}>{token.cssVar}</code>
              </TableHeaderCell>
              <CopyCell token={token} />
              <TableCell>{token.description}</TableCell>
              {token.themed ? (
                <>
                  <TableCell>
                    <Value value={token.values.light} />
                  </TableCell>
                  <TableCell>
                    <Value value={token.values.dark} />
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={themed ? 2 : 1}>
                  {themed && <span className={styles.ref}>Both themes</span>}
                  <Value value={token.values.all} reduced={token.values.reduced} />
                </TableCell>
              )}
              <TableCell>
                <Specimen token={token} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
