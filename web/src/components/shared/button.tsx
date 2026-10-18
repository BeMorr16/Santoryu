import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
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

/** Classes for Button's look, for any element that should look like a button (R5.5, R12.9). */
export function buttonClassName({
  variant = "secondary",
  size = "md",
}: Pick<ButtonLookProps, "variant" | "size">): string {
  return cx(styles.button, styles[variant], styles[size]);
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
