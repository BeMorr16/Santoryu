import { useId, type ReactNode } from "react";
import { Typography } from "../../components/Typography/Typography.tsx";
import styles from "./Showcase.module.css";

/** A captioned group of live examples inside a preview panel, named by its caption (refinement R8.13). */
export function Example({
  title,
  layout = "row",
  children,
}: {
  title: string;
  layout?: "row" | "column";
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className={styles.example}>
      <Typography id={titleId} variant="label">
        {title}
      </Typography>
      <div className={layout === "row" ? styles.row : styles.example}>{children}</div>
    </div>
  );
}
