import type { ReactNode } from "react";
import styles from "./Showcase.module.css";

/** A captioned group of live examples inside a preview panel. */
export function Example({
  title,
  layout = "row",
  children,
}: {
  title: string;
  layout?: "row" | "column";
  children: ReactNode;
}) {
  return (
    <div className={styles.example}>
      <p className="label">{title}</p>
      <div className={layout === "row" ? styles.row : styles.example}>{children}</div>
    </div>
  );
}
