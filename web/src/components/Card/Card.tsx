import type { ElementType, ReactNode } from "react";
import { cx } from "../shared/cx.ts";
import type { PolymorphicProps } from "../shared/polymorphic.ts";
import { Link } from "../Link/Link.tsx";
import styles from "./Card.module.css";

export type CardElement = "article" | "section" | "div" | "li";

/** A link card needs a heading: its text is the link's whole accessible name (R10.3). */
type CardLinkProps =
  | { href?: never; newTab?: never }
  | { href: string; newTab?: boolean | undefined; heading: ReactNode };

export type CardOwnProps = {
  heading?: ReactNode;
  /** Fits the card into the page's heading outline (R10.2). */
  headingLevel?: 2 | 3 | 4 | 5 | 6 | undefined;
} & CardLinkProps;

export type CardProps<E extends CardElement = "article"> = PolymorphicProps<E, CardOwnProps>;

/** A surface for grouped content, optionally linking somewhere as a whole (R10). */
export function Card<E extends CardElement = "article">({
  as,
  heading,
  headingLevel = 3,
  href,
  newTab,
  className,
  children,
  ...rest
}: CardProps<E>) {
  // Widened so JSX doesn't re-check rest props per element; PolymorphicProps checked them.
  const Element = (as ?? "article") as ElementType;
  const Heading = `h${String(headingLevel)}` as ElementType;
  return (
    <Element
      {...rest}
      className={cx(styles.card, href !== undefined && styles.interactive, className)}
    >
      {heading !== undefined && (
        <Heading className={styles.heading}>
          {href === undefined ? (
            heading
          ) : (
            <Link href={href} newTab={newTab} className={styles.link}>
              {heading}
            </Link>
          )}
        </Heading>
      )}
      {children}
    </Element>
  );
}
