import { cx } from "../../components/shared/cx.ts";
import type { BackdropKind } from "../route-handle.ts";
import styles from "./Backdrop.module.css";
import { SphereCanvas } from "./SphereCanvas.tsx";

/** The decorative layer behind every page (site-backdrop R1): the dot sphere, or the frame glow. */
export function Backdrop({ kind }: { kind: BackdropKind }) {
  return kind === "striking" ? (
    <SphereCanvas />
  ) : (
    <div aria-hidden="true" className={cx(styles.layer, styles.quiet)} />
  );
}
