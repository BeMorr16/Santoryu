import type { ElementType } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import styles from "./Typography.module.css";

export type TypographyElement =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "label"
  | "legend"
  | "strong"
  | "em"
  | "small"
  | "mark"
  | "s"
  | "code"
  | "kbd"
  | "samp"
  | "abbr"
  | "cite"
  | "q"
  | "time"
  | "blockquote"
  | "figcaption"
  | "caption"
  | "li"
  | "dt"
  | "dd";

export type TypographyVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "lead"
  | "body"
  | "small"
  | "label"
  | "code"
  | "inherit";

export type TypographyTone =
  "default" | "muted" | "subtle" | "accent" | "accent-2" | "success" | "warning" | "error";

export interface TypographyOwnProps {
  /** The look. Unset: derived from the element (refinement R12.3). The level comes only from `as`. */
  variant?: TypographyVariant | undefined;
  /** Text color. Unset: inherited. Status tones need wording that states the status (R12.5). */
  tone?: TypographyTone | undefined;
  /** Caps the line length at about 65 characters (R12.6). */
  measure?: boolean | undefined;
}

export type TypographyProps<E extends TypographyElement = "p"> = PolymorphicProps<
  E,
  TypographyOwnProps
>;

/** The look each element takes when `variant` is unset (refinement R12.3). */
const defaultVariant: Record<TypographyElement, TypographyVariant> = {
  p: "body",
  span: "inherit",
  div: "body",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  label: "body",
  legend: "body",
  strong: "inherit",
  em: "inherit",
  small: "small",
  mark: "inherit",
  s: "inherit",
  code: "code",
  kbd: "code",
  samp: "code",
  abbr: "inherit",
  cite: "inherit",
  q: "inherit",
  time: "inherit",
  blockquote: "body",
  figcaption: "body",
  caption: "body",
  li: "body",
  dt: "body",
  dd: "body",
};

const headingVariants = new Set<TypographyVariant>(["display", "h1", "h2", "h3", "h4", "h5", "h6"]);
const runningVariants = new Set<TypographyVariant>(["lead", "body", "small", "label"]);

/** Text in one of the type scale's looks, with the element (and heading level) chosen separately (R12). */
export function Typography<E extends TypographyElement = "p">({
  as,
  variant,
  tone,
  measure = false,
  className,
  ...rest
}: TypographyProps<E>) {
  const element = as ?? "p";
  const look = variant ?? defaultVariant[element];
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = element as ElementType;
  return (
    <Element
      {...rest}
      className={cx(
        styles.typography,
        look !== "inherit" && styles[look],
        headingVariants.has(look) && styles.heading,
        runningVariants.has(look) && styles.running,
        tone && styles[`tone-${tone}`],
        measure && styles.measure,
        className,
      )}
    />
  );
}
