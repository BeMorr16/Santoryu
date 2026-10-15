import { useId } from "react";
import type { TokenMeta, TokenValue } from "../tokens/types.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./TokenTable.module.css";

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

export function TokenTable({ caption, tokens }: { caption: string; tokens: readonly TokenMeta[] }) {
  const themed = tokens.some((token) => token.themed);
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
            <th scope="col">Description</th>
            {themed ? (
              <>
                <th scope="col">Light</th>
                <th scope="col">Dark</th>
              </>
            ) : (
              <th scope="col">Value</th>
            )}
            <th scope="col">Preview</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.name}>
              <th scope="row">
                <code className={styles.name}>{token.cssVar}</code>
              </th>
              <td>{token.description}</td>
              {token.themed ? (
                <>
                  <td>
                    <Value value={token.values.light} />
                  </td>
                  <td>
                    <Value value={token.values.dark} />
                  </td>
                </>
              ) : (
                <td colSpan={themed ? 2 : 1}>
                  {themed && <span className={styles.ref}>Both themes</span>}
                  <Value value={token.values.all} reduced={token.values.reduced} />
                </td>
              )}
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
