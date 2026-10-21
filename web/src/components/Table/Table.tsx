import {
  createContext,
  useContext,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { cx } from "../shared/cx.ts";
import { useOverflowFocus } from "../shared/overflow.ts";
import { assignRef } from "../shared/ref.ts";
import { Typography } from "../Typography/Typography.tsx";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./Table.module.css";

export interface TableOwnProps {
  /** Names the table and its scroll box (refinement R16.2). No interactive content. */
  caption: ReactNode;
  /** Hide the caption visually; it still names the table. Default false (refinement R16.3). */
  hideCaption?: boolean | undefined;
  /** TableHead, TableBody and TableFoot (or native thead, tbody and tfoot), after any colgroups. */
  children: ReactNode;
}

export type TableProps = TableOwnProps & Omit<ComponentPropsWithRef<"div">, keyof TableOwnProps>;

export type CellAlign = "start" | "center" | "end";

export interface TableHeaderCellOwnProps {
  /** Default: "col" in TableHead, "row" in TableBody or TableFoot (refinement R16.4). */
  scope?: "col" | "row" | "colgroup" | "rowgroup" | undefined;
  /** Text alignment. Default "start" (refinement R16.5). */
  align?: CellAlign | undefined;
  children: ReactNode;
}

export type TableHeaderCellProps = TableHeaderCellOwnProps &
  Omit<ComponentPropsWithRef<"th">, keyof TableHeaderCellOwnProps>;

export interface TableCellOwnProps {
  /** Text alignment. Default "start" (refinement R16.5). */
  align?: CellAlign | undefined;
  children: ReactNode;
}

export type TableCellProps = TableCellOwnProps &
  Omit<ComponentPropsWithRef<"td">, keyof TableCellOwnProps>;

export type TableHeadProps = ComponentPropsWithRef<"thead">;
export type TableBodyProps = ComponentPropsWithRef<"tbody">;
export type TableFootProps = ComponentPropsWithRef<"tfoot">;
export type TableRowProps = ComponentPropsWithRef<"tr">;

/** The section a header cell sits in, which gives its default scope (refinement R16.4). */
const TableSection = createContext<"head" | "body" | "foot" | null>(null);

const alignClass: Record<CellAlign, string | undefined> = {
  start: undefined,
  center: styles.alignCenter,
  end: styles.alignEnd,
};

/**
 * A captioned table that scrolls sideways inside its root (refinement R16). While it overflows,
 * the root is a focusable group named by the caption, since Safari doesn't make scrolling boxes
 * keyboard-focusable (R16.6).
 */
export function Table({
  caption,
  hideCaption = false,
  children,
  className,
  ref,
  ...rest
}: TableProps) {
  const captionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  // The root follows its container; the table follows its content's minimum width past that.
  const focusable = useOverflowFocus(rootRef, tableRef);
  return (
    <div
      {...rest}
      ref={(node) => {
        rootRef.current = node;
        assignRef(ref, node);
      }}
      className={cx(styles.root, className)}
      {...(focusable && { tabIndex: 0, role: "group", "aria-labelledby": captionId })}
    >
      <table ref={tableRef} className={styles.table}>
        {hideCaption ? (
          <VisuallyHidden as="caption" id={captionId}>
            {caption}
          </VisuallyHidden>
        ) : (
          <Typography as="caption" id={captionId} className={styles.caption}>
            {caption}
          </Typography>
        )}
        {children}
      </table>
    </div>
  );
}

export function TableHead(props: TableHeadProps) {
  return (
    <TableSection value="head">
      <thead {...props} />
    </TableSection>
  );
}

export function TableBody(props: TableBodyProps) {
  return (
    <TableSection value="body">
      <tbody {...props} />
    </TableSection>
  );
}

export function TableFoot(props: TableFootProps) {
  return (
    <TableSection value="foot">
      <tfoot {...props} />
    </TableSection>
  );
}

export function TableRow(props: TableRowProps) {
  return <tr {...props} />;
}

export function TableHeaderCell({
  scope,
  align = "start",
  className,
  ...rest
}: TableHeaderCellProps) {
  const section = useContext(TableSection);
  const derived = section === "head" ? "col" : section === null ? undefined : "row";
  return (
    <th
      {...rest}
      scope={scope ?? derived}
      className={cx(alignClass[align], className) || undefined}
    />
  );
}

export function TableCell({ align = "start", className, ...rest }: TableCellProps) {
  // No class attribute at all on a start-aligned cell without a className.
  return <td {...rest} className={cx(alignClass[align], className) || undefined} />;
}
