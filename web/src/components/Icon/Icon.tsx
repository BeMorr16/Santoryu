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
 * SVG attributes and `children` reach the `<svg>` as escape hatches (refinement R1.5): `fill`
 * replaces the default currentColor, `viewBox` and `children` work on the family's 256-unit grid,
 * and the size classes override `width`/`height`. `color` is omitted because it duplicates
 * `fill`. The accessibility attributes are `never` because `label` owns them (`tabIndex` too: an
 * icon is never focusable), and hyphenated JSX props are only checked when declared.
 */
export type IconProps = IconOwnProps & {
  "aria-label"?: never;
  "aria-hidden"?: never;
  "aria-labelledby"?: never;
  role?: never;
  tabIndex?: never;
} & Omit<
    ComponentPropsWithRef<"svg">,
    | keyof IconOwnProps
    | "aria-label"
    | "aria-hidden"
    | "aria-labelledby"
    | "role"
    | "tabIndex"
    | "color"
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
  // Cleared after the rest props, so only `label` can name the icon and nothing can focus it.
  const accessibility = {
    "aria-labelledby": undefined,
    tabIndex: undefined,
    ...(label === undefined
      ? ({ "aria-hidden": true, focusable: "false" } as const)
      : ({ role: "img", "aria-label": label } as const)),
  };
  return (
    <Glyph
      {...rest}
      {...accessibility}
      weight={weightMap[weight]}
      className={cx(styles.icon, styles[`size-${size}`], className)}
    />
  );
}
