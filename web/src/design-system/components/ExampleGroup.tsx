import { slug } from "./slug.ts";
import type { ExampleDoc } from "./Showcase.ts";
import styles from "./Showcase.module.css";

/**
 * One example in a preview panel: a group named by its h3, whose id (the slugged title) is the
 * example's On this page link target (ds-components R4.3, R4.6).
 */
export function ExampleGroup({ title, layout = "row", Content }: ExampleDoc) {
  const id = slug(title);
  return (
    <div role="group" aria-labelledby={id} className={styles.example}>
      <h3 id={id}>{title}</h3>
      <div className={layout === "row" ? styles.row : styles.example}>
        <Content />
      </div>
    </div>
  );
}
