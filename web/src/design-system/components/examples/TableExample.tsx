import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";

const pages = [
  { page: "Home", views: 1204, updated: "Oct 2026" },
  { page: "Design System", views: 386, updated: "Oct 2026" },
  { page: "Components", views: 92, updated: "Oct 2026" },
];

export function TableExample() {
  return (
    <Table caption="Page views this month">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Page</TableHeaderCell>
          <TableHeaderCell align="end">Views</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pages.map(({ page, views, updated }) => (
          <TableRow key={page}>
            <TableHeaderCell>{page}</TableHeaderCell>
            <TableCell align="end">{views.toLocaleString("en-US")}</TableCell>
            <TableCell>{updated}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
