import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/Table/Table.tsx";
import tableStyles from "../TableContent.module.css";
import type { PropDoc } from "./PropDocs.ts";

export function PropsTable({
  caption,
  props,
}: {
  caption: string;
  props: Record<string, PropDoc>;
}) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Prop</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Default</TableHeaderCell>
          <TableHeaderCell>Description</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(props).map(([name, doc]) => (
          <TableRow key={name}>
            <TableHeaderCell>
              <code className={tableStyles.name}>{name}</code>
            </TableHeaderCell>
            <TableCell>
              <code className={tableStyles.value}>{doc.type}</code>
            </TableCell>
            <TableCell>
              {doc.default === undefined ? (
                "—"
              ) : (
                <code className={tableStyles.value}>{doc.default}</code>
              )}
            </TableCell>
            <TableCell>{doc.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
