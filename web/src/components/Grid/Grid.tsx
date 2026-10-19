import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import { listRole, type Gap, type LayoutElement } from "../shared/layout.ts";
import layout from "../shared/layout.module.css";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Grid.module.css";

export interface GridOwnProps {
  /** Minimum column width, from `size.column.*` (R9.1). */
  min?: "sm" | "md" | "lg" | undefined;
  gap?: Gap | undefined;
}

export type GridProps<E extends LayoutElement = "div"> = PolymorphicProps<E, GridOwnProps>;

/** Responsive auto-fit columns that adapt to their container (R9). */
export function Grid<E extends LayoutElement = "div">({
  as,
  min = "md",
  gap = "md",
  className,
  role,
  ...rest
}: GridProps<E>) {
  const tag = as ?? "div";
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = tag as ElementType;
  return (
    <Element
      {...rest}
      {...listRole(tag, role)}
      className={cx(
        styles.grid,
        styles[`min-${min}`],
        layout[`row-gap-${gap}`],
        layout[`column-gap-${gap}`],
        (tag === "ul" || tag === "ol") && layout.list,
        tag === "fieldset" && layout.fieldset,
        className,
      )}
    />
  );
}
