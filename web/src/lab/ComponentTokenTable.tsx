import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/Table/Table.tsx";
import { componentTokensOf } from "../tokens/metadata.ts";
import type { TokenValue } from "../tokens/types.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./TableContent.module.css";

function Value({ value }: { value: TokenValue }) {
  return (
    <>
      <code className={styles.value}>{value.css}</code>
      <span className={styles.ref}>from {value.ref}</span>
    </>
  );
}

/** One component's styling hooks, from generated metadata (R14.3, R15.5). */
export function ComponentTokenTable({
  component,
  caption,
  hideCaption = false,
}: {
  component: string;
  caption: string;
  /** Under a heading that already names it, as on /lab/tokens (refinement R16.11). */
  hideCaption?: boolean;
}) {
  const tokens = componentTokensOf(component);
  return (
    <Table caption={caption} hideCaption={hideCaption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <TableHeaderCell>Aliases</TableHeaderCell>
          <TableHeaderCell>Light</TableHeaderCell>
          <TableHeaderCell>Dark</TableHeaderCell>
          <TableHeaderCell>Preview</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {tokens.map((token) => (
          <TableRow key={token.name}>
            <TableHeaderCell>
              <code className={styles.name}>{token.cssVar}</code>
              <span className={styles.ref}>{token.description}</span>
            </TableHeaderCell>
            <TableCell>
              <code className={styles.value}>{token.aliases}</code>
            </TableCell>
            <TableCell>
              <Value value={token.values.light} />
              {token.values.reduced && (
                <span className={styles.ref}>
                  Reduced motion: <code>{token.values.reduced.css}</code>
                </span>
              )}
            </TableCell>
            <TableCell>
              <Value value={token.values.dark} />
            </TableCell>
            <TableCell>
              <Specimen token={token} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
