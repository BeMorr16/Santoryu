import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/Table/Table.tsx";

export interface KeyboardRow {
  keys: string;
  action: string;
}

export function KeyboardTable({
  caption,
  rows,
}: {
  caption: string;
  rows: readonly KeyboardRow[];
}) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Key</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.keys}>
            <TableHeaderCell>
              <kbd>{row.keys}</kbd>
            </TableHeaderCell>
            <TableCell>{row.action}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
