import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import { listRole, type Gap, type LayoutElement } from "../shared/layout.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Stack.module.css";

export interface StackOwnProps {
  /** No reverse directions, so DOM order is visual order (R8.4). */
  direction?: "vertical" | "horizontal" | undefined;
  gap?: Gap | undefined;
  align?: "start" | "center" | "end" | "stretch" | "baseline" | undefined;
  justify?: "start" | "center" | "end" | "between" | undefined;
  wrap?: boolean | undefined;
}

export type StackProps<E extends LayoutElement = "div"> = PolymorphicProps<E, StackOwnProps>;

/** Vertical or horizontal flow with token gaps (R8). */
export function Stack<E extends LayoutElement = "div">({
  as,
  direction = "vertical",
  gap = "md",
  align,
  justify,
  wrap = false,
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
        styles[`gap-${gap}`],
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        wrap && styles.wrap,
        list && styles.list,
        tag === "fieldset" && styles.fieldset,
        className,
      )}
    />
  );
}
