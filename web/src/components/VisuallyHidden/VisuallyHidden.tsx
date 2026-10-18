import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./VisuallyHidden.module.css";

export type VisuallyHiddenElement = "span" | "div" | "p" | "a";

export interface VisuallyHiddenOwnProps {
  /** Show the content while it or a descendant has focus (skip links). */
  focusable?: boolean;
}

export type VisuallyHiddenProps<E extends VisuallyHiddenElement = "span"> = PolymorphicProps<
  E,
  VisuallyHiddenOwnProps
>;

/** Content announced by assistive technology but not shown (R7). */
export function VisuallyHidden<E extends VisuallyHiddenElement = "span">({
  as,
  focusable = false,
  className,
  ...rest
}: VisuallyHiddenProps<E>) {
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = (as ?? "span") as ElementType;
  return (
    <Element {...rest} className={cx(styles.root, focusable && styles.focusable, className)} />
  );
}
