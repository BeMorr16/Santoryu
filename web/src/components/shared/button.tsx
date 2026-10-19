import { Children, isValidElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./button-styles.module.css";
import { cx } from "./cx.ts";

export interface ButtonLookProps {
  variant?: "primary" | "secondary" | "ghost" | undefined;
  size?: "sm" | "md" | undefined;
  /** Decorative icon before the label. */
  iconStart?: IconName | undefined;
  /** Decorative icon after the label. */
  iconEnd?: IconName | undefined;
}

type IconOnlyProps = Pick<ButtonLookProps, "iconStart" | "iconEnd"> & {
  children?: ReactNode;
  /** Another visible icon the caller adds, such as Link's new-tab icon. */
  extraIcon?: boolean | undefined;
};

/**
 * One icon and nothing else visible, so the button is square (refinement R3.5). Empty children
 * (null, undefined, booleans) count as none; fragments and other wrappers count as visible.
 */
function isIconOnly({ iconStart, iconEnd, children, extraIcon }: IconOnlyProps): boolean {
  if ([iconStart, iconEnd, extraIcon].filter(Boolean).length !== 1) return false;
  return Children.toArray(children).every(
    (child) => isValidElement(child) && child.type === VisuallyHidden,
  );
}

/** Classes for Button's look, for any element that should look like a button (R5.5, R12.9). */
export function buttonClassName({
  variant = "secondary",
  size = "md",
  iconStart,
  iconEnd,
  children,
  extraIcon,
}: Pick<ButtonLookProps, "variant" | "size"> & IconOnlyProps): string {
  return cx(
    styles.button,
    styles[variant],
    styles[size],
    isIconOnly({ iconStart, iconEnd, children, extraIcon }) && styles.iconOnly,
  );
}

/** A button's label between its decorative icons (R4.3). */
export function ButtonContent({
  iconStart,
  iconEnd,
  children,
}: Pick<ButtonLookProps, "iconStart" | "iconEnd"> & { children?: ReactNode }) {
  return (
    <>
      {iconStart && <Icon name={iconStart} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </>
  );
}
