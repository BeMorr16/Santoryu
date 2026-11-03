import { cx } from "../components/shared/cx.ts";
import styles from "./SafariBars.module.css";

/**
 * Makes iOS Safari's status bar and toolbar solid in the page color, so content scrolling under
 * them is hidden where the backdrop ends (iOS 26 clips fixed layers, the backdrop included, to
 * the band between the bars). Two decorative strips, shown on iOS only; see the CSS.
 */
export function SafariBars() {
  return (
    <>
      <div aria-hidden="true" className={cx(styles.edge, styles.top)} />
      <div aria-hidden="true" className={cx(styles.edge, styles.bottom)} />
    </>
  );
}
