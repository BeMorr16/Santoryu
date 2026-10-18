import type { ComponentPropsWithRef } from "react";
import { cx } from "../shared/cx.ts";
import styles from "./Icon.module.css";
import { defaultWeight, icons, weightMap, type IconName, type IconWeight } from "./registry.ts";

export interface IconOwnProps {
  /** A registry name. Unknown names are a type error (R6.1). */
  name: IconName;
  /** Accessible name. Without one the icon is decorative and hidden (R6.2, R6.3). */
  label?: string;
  /** `inherit` follows the surrounding text size (1em); the others use `size.icon.*`. */
  size?: "inherit" | "sm" | "md" | "lg";
  weight?: IconWeight;
}

/**
 * `color` is omitted: icons always use currentColor (R6.4). The accessibility attributes are
 * `never` because `label` owns them, and hyphenated JSX props are only checked when declared.
 */
export type IconProps = IconOwnProps & {
  "aria-label"?: never;
  "aria-hidden"?: never;
  role?: never;
} & Omit<
    ComponentPropsWithRef<"svg">,
    keyof IconOwnProps | "aria-label" | "aria-hidden" | "role" | "color"
  >;

/** One icon from the registry, colored by `currentColor` (R6). */
export function Icon({
  name,
  label,
  size = "inherit",
  weight = defaultWeight,
  className,
  ...rest
}: IconProps) {
  const Glyph = icons[name];
  const accessibility =
    label === undefined
      ? ({ "aria-hidden": true, focusable: "false" } as const)
      : ({ role: "img", "aria-label": label } as const);
  return (
    <Glyph
      {...rest}
      {...accessibility}
      weight={weightMap[weight]}
      className={cx(styles.icon, styles[`size-${size}`], className)}
    />
  );
}
