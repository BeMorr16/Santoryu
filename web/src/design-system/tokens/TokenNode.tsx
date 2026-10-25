import { Fragment, type ReactNode } from "react";
import { Typography } from "../../components/Typography/Typography.tsx";
import type { AnyTokenMeta } from "../../tokens/types.ts";
import { Specimen } from "../Specimen.tsx";
import { TokenLink } from "./TokenLink.tsx";
import styles from "./TokenNode.module.css";

/** A token path that may break after each dot, so the longest fits a column (ds-tokens §4.3). */
export function BreakablePath({ path }: { path: string }) {
  return path.split(".").map((part, index) => (
    // Parts have no identity beyond their position in this one path.
    <Fragment key={index}>
      {index > 0 && (
        <>
          .<wbr />
        </>
      )}
      {part}
    </Fragment>
  ));
}

/**
 * One token in a chain: a decorative specimen, its path linking to its row, and its value
 * (ds-tokens R2.5). Shared by the tokens page's flow diagram and the theme creator's chain panel
 * (theme-creator R8.3). `page` links the path to the row on another page, such as the tokens page.
 */
export function TokenNode({
  token,
  label,
  page,
  specimen,
  children,
}: {
  token: AnyTokenMeta;
  label?: string | undefined;
  page?: string | undefined;
  /** A literal value for the specimen, instead of the token's own (the chain panel's live value). */
  specimen?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={styles.node}>
      <Specimen token={token} value={specimen} />
      {label && (
        <Typography as="span" variant="label">
          {label}
        </Typography>
      )}
      <code className={styles.path}>
        <TokenLink token={token.name} page={page}>
          <BreakablePath path={token.name} />
        </TokenLink>
      </code>
      <span className={styles.value}>{children}</span>
    </div>
  );
}
