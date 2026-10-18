import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./VisuallyHidden.module.css";

export type VisuallyHiddenElement =
  | "span"
  | "div"
  | "p"
  | "a"
  | "label"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "strong"
  | "em"
  | "small"
  | "mark"
  | "s"
  | "blockquote"
  | "figcaption"
  | "caption"
  | "li"
  | "dt"
  | "dd";

export interface VisuallyHiddenOwnProps {
  /** Show the content as an overlay while it or a descendant has focus (skip links). Required with as="a". */
  focusable?: boolean;
}

/**
 * A hidden Tab stop must show when focused (WCAG 2.4.7), so `as="a"` requires `focusable`
 * (refinement R2.5), and without it `tabIndex` can only be -1, a programmatic focus target (R2.12).
 * Intersected rather than passed as PolymorphicProps' `Own`, so `keyof Own` stays concrete and the
 * component body can still read the native props.
 */
type FocusableRule<E extends VisuallyHiddenElement> = E extends "a"
  ? { focusable: true }
  : { focusable?: false; tabIndex?: -1 } | { focusable: true };

export type VisuallyHiddenProps<E extends VisuallyHiddenElement = "span"> = PolymorphicProps<
  E,
  VisuallyHiddenOwnProps
> &
  FocusableRule<E>;

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
