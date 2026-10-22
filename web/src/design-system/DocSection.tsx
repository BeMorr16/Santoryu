import type { ReactNode } from "react";
import styles from "./DocLayout.module.css";

/** An h2 section with the stable id its On this page link targets (R4.3). Unnamed: not a landmark. */
export function DocSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 id={id}>{label}</h2>
      {children}
    </section>
  );
}
