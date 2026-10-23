import type { ElementType, ReactNode } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import { Link } from "../Link/Link.tsx";
import { Typography, type TypographyVariant } from "../Typography/Typography.tsx";
import styles from "./Card.module.css";

export type CardElement = "article" | "section" | "div" | "li";

export type CardVariant = "raised" | "outlined" | "flat" | "glass";

/** A link card needs a heading: its text is the link's whole accessible name (R10.3). */
type CardLinkProps =
  | { href?: never; newTab?: never }
  | { href: string; newTab?: boolean | undefined; heading: ReactNode };

export type CardOwnProps = {
  heading?: ReactNode;
  /** Fits the card into the page's heading outline; the look comes from `headingVariant` (refinement R8.4, R12.9). */
  headingLevel?: 2 | 3 | 4 | 5 | 6 | undefined;
  /**
   * The heading's look, the same at every level. Default "h4" (refinement R12.9). "inherit" and
   * "code" set no size, so the plain heading's per-level size shows through.
   */
  headingVariant?: TypographyVariant | undefined;
  /** Surface look, from `component.card.<variant>.*`. Default "raised". */
  variant?: CardVariant | undefined;
  /** Bottom part: actions, badges, metadata. Sits at the card's bottom edge (refinement R8.2). */
  footer?: ReactNode;
  /** In a Grid, spans one row per part with `subgrid`, so parts line up across the row (refinement R8.3). */
  subgrid?: boolean | undefined;
  /**
   * A picture or preview, shown full-bleed across the top. It comes after the heading in the DOM,
   * so the heading is read first. Mark decorative media aria-hidden (and inert if it holds controls).
   */
  media?: ReactNode;
} & CardLinkProps;

export type CardProps<E extends CardElement = "article"> = PolymorphicProps<E, CardOwnProps>;

const hasContent = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** A surface for grouped content, optionally linking somewhere as a whole (R10). */
export function Card<E extends CardElement = "article">({
  as,
  heading,
  headingLevel = 3,
  headingVariant = "h4",
  variant = "raised",
  footer,
  subgrid = false,
  media,
  href,
  newTab,
  className,
  children,
  "aria-current": ariaCurrent,
  ...rest
}: CardProps<E>) {
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = (as ?? "article") as ElementType;
  const headingElement = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const linked = href !== undefined;
  const parts = [
    heading !== undefined,
    hasContent(media),
    hasContent(children),
    hasContent(footer),
  ].filter(Boolean).length;
  return (
    <Element
      {...rest}
      // A link card's aria-current belongs to its link (refinement R8.11).
      aria-current={linked ? undefined : ariaCurrent}
      className={cx(
        styles.card,
        styles[variant],
        linked && styles.interactive,
        subgrid && styles.subgrid,
        subgrid && parts > 0 && styles[`rows-${String(parts)}`],
        className,
      )}
    >
      {heading !== undefined && (
        <Typography as={headingElement} variant={headingVariant} className={styles.heading}>
          {linked ? (
            // false turns off Link's automatic marking: link cards are never marked current (refinement R8.11).
            <Link
              href={href}
              newTab={newTab}
              className={styles.link}
              aria-current={ariaCurrent ?? false}
            >
              {heading}
            </Link>
          ) : (
            heading
          )}
        </Typography>
      )}
      {hasContent(media) && <div className={styles.media}>{media}</div>}
      {hasContent(children) && <div className={styles.body}>{children}</div>}
      {hasContent(footer) && <div className={styles.footer}>{footer}</div>}
    </Element>
  );
}
