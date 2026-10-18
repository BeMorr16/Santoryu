import { useId } from "react";
import { componentTokensOf } from "../tokens/metadata.ts";
import type { TokenValue } from "../tokens/types.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./TokenTable.module.css";

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
}: {
  component: string;
  caption: string;
}) {
  const tokens = componentTokensOf(component);
  const captionId = useId();
  return (
    <div className={styles.scroll} role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.caption} id={captionId}>
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Aliases</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
            <th scope="col">Preview</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.name}>
              <th scope="row">
                <code className={styles.name}>{token.cssVar}</code>
                <span className={styles.ref}>{token.description}</span>
              </th>
              <td>
                <code className={styles.value}>{token.aliases}</code>
              </td>
              <td>
                <Value value={token.values.light} />
                {token.values.reduced && (
                  <span className={styles.ref}>
                    Reduced motion: <code>{token.values.reduced.css}</code>
                  </span>
                )}
              </td>
              <td>
                <Value value={token.values.dark} />
              </td>
              <td>
                <Specimen token={token} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
