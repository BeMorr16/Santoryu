import { useId } from "react";
import tableStyles from "../TokenTable.module.css";
import type { PropDoc } from "./PropDocs.ts";

export function PropsTable({
  caption,
  props,
}: {
  caption: string;
  props: Record<string, PropDoc>;
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
            <th scope="col">Prop</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(props).map(([name, doc]) => (
            <tr key={name}>
              <th scope="row">
                <code className={tableStyles.name}>{name}</code>
              </th>
              <td>
                <code className={tableStyles.value}>{doc.type}</code>
              </td>
              <td>
                {doc.default === undefined ? (
                  "—"
                ) : (
                  <code className={tableStyles.value}>{doc.default}</code>
                )}
              </td>
              <td>{doc.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
