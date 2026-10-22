import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/Table/Table.tsx";
import type { PrimitiveTokenMeta } from "../../tokens/types.ts";
import { Specimen } from "../Specimen.tsx";
import styles from "../TableContent.module.css";
import { tokenRowId } from "./reference-ids.ts";
import { UsedBy } from "./UsedBy.tsx";

/** One category's primitives. No copy button: a primitive has no custom property (ds-tokens R5.4, R5.5). */
export function PrimitiveTable({
  caption,
  tokens,
  shown,
}: {
  caption: string;
  tokens: readonly PrimitiveTokenMeta[];
  /** Search results: rows outside it are hidden (R11.3). */
  shown?: ReadonlySet<string> | null | undefined;
}) {
  return (
    <Table caption={caption} hideCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <TableHeaderCell>Value</TableHeaderCell>
          <TableHeaderCell>Preview</TableHeaderCell>
          <TableHeaderCell>Used by</TableHeaderCell>
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
                <code className={styles.name}>{token.name}</code>
              </TableHeaderCell>
              <TableCell>
                <code className={styles.value}>{token.css}</code>
              </TableCell>
              <TableCell>
                <Specimen token={token} />
              </TableCell>
              <TableCell>
                <UsedBy tokens={token.usedBy} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
