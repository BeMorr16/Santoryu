import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/Table/Table.tsx";
import type { SemanticTokenMeta, TokenValue } from "../tokens/types.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./TableContent.module.css";

function Value({ value, reduced }: { value: TokenValue; reduced?: TokenValue | undefined }) {
  return (
    <>
      <code className={styles.value}>{value.css}</code>
      <span className={styles.ref}>from {value.ref}</span>
      {reduced && (
        <span className={styles.ref}>
          Reduced motion: <code>{reduced.css}</code> from {reduced.ref}
        </span>
      )}
    </>
  );
}

/** One category's semantic tokens. Only used under /lab/tokens' h2s, so the caption is hidden. */
export function TokenTable({
  caption,
  tokens,
}: {
  caption: string;
  tokens: readonly SemanticTokenMeta[];
}) {
  const themed = tokens.some((token) => token.themed);
  return (
    <Table caption={caption} hideCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
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
        {tokens.map((token) => (
          <TableRow key={token.name}>
            <TableHeaderCell>
              <code className={styles.name}>{token.cssVar}</code>
            </TableHeaderCell>
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
        ))}
      </TableBody>
    </Table>
  );
}
