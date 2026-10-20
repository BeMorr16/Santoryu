import type { ElementType } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Badge.module.css";

export type BadgeElement = "span" | "li";

export type BadgeVariant = "neutral" | "accent" | "accent-2" | "success" | "warning" | "error";

export interface BadgeOwnProps {
  /**
   * neutral, accent and accent-2 are emphasis only; success, warning and error carry meaning,
   * which the wording must state (refinement R9.8).
   */
  variant?: BadgeVariant | undefined;
  size?: "sm" | "md" | undefined;
  /** Decorative icon before the text; the text must say everything on its own (refinement R9.9). */
  icon?: IconName | undefined;
}

export type BadgeProps<E extends BadgeElement = "span"> = PolymorphicProps<E, BadgeOwnProps>;

/** A short, non-interactive label, such as one item of a tech stack or a status (R11). */
export function Badge<E extends BadgeElement = "span">({
  as,
  variant = "neutral",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: BadgeProps<E>) {
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = (as ?? "span") as ElementType;
  return (
    <Element {...rest} className={cx(styles.badge, styles[variant], styles[size], className)}>
      {icon && <Icon name={icon} className={styles.icon} />}
      {children}
    </Element>
  );
}
