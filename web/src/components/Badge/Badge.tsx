import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Badge.module.css";

export type BadgeElement = "span" | "li";

export interface BadgeOwnProps {
  /** Emphasis only, not meaning, so color alone is fine (R11.3; stated on /lab). */
  variant?: "neutral" | "accent" | undefined;
  size?: "sm" | "md" | undefined;
}

export type BadgeProps<E extends BadgeElement = "span"> = PolymorphicProps<E, BadgeOwnProps>;

/** A short, non-interactive label, such as one item of a tech stack (R11). */
export function Badge<E extends BadgeElement = "span">({
  as,
  variant = "neutral",
  size = "md",
  className,
  ...rest
}: BadgeProps<E>) {
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = (as ?? "span") as ElementType;
  return (
    <Element {...rest} className={cx(styles.badge, styles[variant], styles[size], className)} />
  );
}
