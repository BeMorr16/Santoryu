import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import { listRole, type Gap, type LayoutElement } from "../shared/layout.ts";
import layout from "../shared/layout.module.css";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Stack.module.css";

export interface StackOwnProps {
  /** No reverse directions, so DOM order is visual order (R8.4). */
  direction?: "vertical" | "horizontal" | undefined;
  /** Sets both gaps; `rowGap` and `columnGap` override one axis. */
  gap?: Gap | undefined;
  /** Between rows: items in a vertical Stack, wrapped lines in a horizontal one (`space.stack.*`). */
  rowGap?: Gap | undefined;
  /** Between columns: items in a horizontal Stack, wrapped columns in a vertical one (`space.inline.*`). */
  columnGap?: Gap | undefined;
  align?: "start" | "center" | "end" | "stretch" | "baseline" | undefined;
  justify?: "start" | "center" | "end" | "between" | undefined;
  /** Default: true when horizontal, so rows reflow (refinement R6.1). */
  wrap?: boolean | undefined;
}

export type StackProps<E extends LayoutElement = "div"> = PolymorphicProps<E, StackOwnProps>;

/** Vertical or horizontal flow with token gaps (R8). */
export function Stack<E extends LayoutElement = "div">({
  as,
  direction = "vertical",
  gap = "md",
  rowGap = gap,
  columnGap = gap,
  align,
  justify,
  wrap = direction === "horizontal",
  className,
  role,
  ...rest
}: StackProps<E>) {
  const tag = as ?? "div";
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = tag as ElementType;
  const list = tag === "ul" || tag === "ol";
  return (
    <Element
      {...rest}
      {...listRole(tag, role)}
      className={cx(
        styles.stack,
        styles[direction],
        layout[`row-gap-${rowGap}`],
        layout[`column-gap-${columnGap}`],
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        wrap && styles.wrap,
        list && layout.list,
        tag === "fieldset" && layout.fieldset,
        className,
      )}
    />
  );
}
