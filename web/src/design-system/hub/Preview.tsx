import type { ReactNode } from "react";
import { cx } from "../../components/shared/cx.ts";
import styles from "./Hub.module.css";

/** A hub card's decorative picture: hidden from assistive tech, and inert so it adds no Tab stops (ds-hub R3.5). */
export function Preview({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" inert className={cx(styles.frame, className)}>
      {children}
    </div>
  );
}
