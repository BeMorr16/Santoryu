import { Link } from "../components/Link/Link.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../components/Table/Table.tsx";
import type { ComponentTokenMeta, TokenValue } from "../tokens/types.ts";
import type { sections } from "./components/toc.ts";
import { componentPages, componentPath } from "./components/pages.ts";
import { Specimen } from "./Specimen.tsx";
import styles from "./TableContent.module.css";
import { tokenRowId } from "./tokens/reference-ids.ts";
import { TokenLink } from "./tokens/TokenLink.tsx";
import { CopyCell, CopyHeaderCell } from "./tokens/CopyCell.tsx";

/** The component pages' Component tokens section, checked against their sections. */
const tokensSectionId: (typeof sections)[number]["id"] = "component-tokens";

function Value({ value, page }: { value: TokenValue; page: string }) {
  return (
    <>
      <code className={styles.value}>{value.css}</code>
      <span className={styles.ref}>
        from <TokenLink token={value.ref} page={page} />
      </span>
    </>
  );
}

/** The component page a token belongs to, linked to its Component tokens section (ds-tokens R6.2). */
function ComponentName({ component }: { component: string }) {
  const page = componentPages.find(({ id }) => id === component);
  if (!page) return component;
  return (
    <Link href={`${componentPath(page.id)}#${tokensSectionId}`} underline="hover">
      {page.name}
    </Link>
  );
}

/**
 * Component tokens, from generated metadata (R14.3, R15.5): one component's on its page, or a
 * category's for every component on /design-system/tokens (ds-tokens R6.2).
 */
export function ComponentTokenTable({
  tokens,
  caption,
  hideCaption = false,
  showComponent = false,
  linkBase = "",
  shown,
}: {
  tokens: readonly ComponentTokenMeta[];
  caption: string;
  /** Under a heading that already names it, as on /design-system/tokens (refinement R16.11). */
  hideCaption?: boolean;
  /** Adds a Component column, for tokens of several components. */
  showComponent?: boolean;
  /** The page the token reference links go to: /design-system/tokens from another page. */
  linkBase?: string;
  /** Search results: rows outside it are hidden (R11.3). */
  shown?: ReadonlySet<string> | null | undefined;
}) {
  return (
    <Table caption={caption} hideCaption={hideCaption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Token</TableHeaderCell>
          <CopyHeaderCell />
          {showComponent && <TableHeaderCell>Component</TableHeaderCell>}
          <TableHeaderCell>Description</TableHeaderCell>
          <TableHeaderCell>Aliases</TableHeaderCell>
          <TableHeaderCell>Light</TableHeaderCell>
          <TableHeaderCell>Dark</TableHeaderCell>
          <TableHeaderCell>Preview</TableHeaderCell>
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
                <code className={styles.name}>{token.cssVar}</code>
              </TableHeaderCell>
              <CopyCell token={token} />
              {showComponent && (
                <TableCell>
                  <ComponentName component={token.component} />
                </TableCell>
              )}
              <TableCell>{token.description}</TableCell>
              <TableCell>
                <code className={styles.value}>
                  <TokenLink token={token.aliases} page={linkBase} />
                </code>
              </TableCell>
              <TableCell>
                <Value value={token.values.light} page={linkBase} />
                {token.values.reduced && (
                  <span className={styles.ref}>
                    Reduced motion: <code>{token.values.reduced.css}</code>
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Value value={token.values.dark} page={linkBase} />
              </TableCell>
              <TableCell>
                <Specimen token={token} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
