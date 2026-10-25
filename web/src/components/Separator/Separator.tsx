import type { ComponentPropsWithoutRef, Ref } from "react";
import { cx } from "../shared/cx.ts";
import styles from "./Separator.module.css";

export type SeparatorOrientation = "horizontal" | "vertical";

export type SeparatorVariant = "subtle" | "strong";

export type SeparatorThickness = "thin" | "thick";

export interface SeparatorOwnProps {
  /** Default "horizontal" (refinement R17.3). */
  orientation?: SeparatorOrientation | undefined;
  /** A div hidden from assistive technology instead of an hr. Default false (refinement R17.2). */
  decorative?: boolean | undefined;
  /** Default "subtle"; "strong" is checked to 3:1 (refinement R17.5). */
  variant?: SeparatorVariant | undefined;
  /** Default "thin" (refinement R17.5). */
  thickness?: SeparatorThickness | undefined;
  /** A separator's children are never read (refinement R17.1). */
  children?: never;
}

/**
 * `role`, `aria-orientation` and `aria-hidden` come from `decorative` and `orientation`, and there's
 * no `tabIndex`: a focusable separator is a splitter (refinement R17.1, R17.2).
 */
export type SeparatorProps = SeparatorOwnProps &
  Omit<
    ComponentPropsWithoutRef<"hr">,
    keyof SeparatorOwnProps | "role" | "tabIndex" | "aria-orientation" | "aria-hidden"
  > & {
    /** The hr, or the div when decorative. */
    ref?: Ref<HTMLElement> | undefined;
    /** `never`, not omitted: JSX doesn't check hyphenated attributes missing from the props type. */
    "aria-orientation"?: never;
    "aria-hidden"?: never;
  };

/** A themed rule between blocks or inline items: an hr, or a hidden div when decorative (refinement R17). */
export function Separator({
  orientation = "horizontal",
  decorative = false,
  variant = "subtle",
  thickness = "thin",
  className,
  ref,
  ...rest
}: SeparatorProps) {
  const classes = cx(
    styles.separator,
    styles[orientation],
    styles[variant],
    styles[thickness],
    className,
  );
  if (decorative) {
    return (
      <div {...rest} ref={ref as Ref<HTMLDivElement>} aria-hidden="true" className={classes} />
    );
  }
  return (
    <hr
      {...rest}
      ref={ref as Ref<HTMLHRElement>}
      // Horizontal is the separator role's implicit orientation (refinement R17.3).
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      className={classes}
    />
  );
}
