import { useId } from "react";
import tableStyles from "../TokenTable.module.css";

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
  const captionId = useId();
  return (
    <div className={tableStyles.scroll} role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className={tableStyles.table}>
        <caption className={tableStyles.caption} id={captionId}>
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.keys}>
              <th scope="row">
                <kbd>{row.keys}</kbd>
              </th>
              <td>{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
