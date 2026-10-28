import { cx } from "../../components/shared/cx.ts";
import type { BackdropKind } from "../route-handle.ts";
import styles from "./Backdrop.module.css";
import { SphereCanvas } from "./SphereCanvas.tsx";

/**
 * The decorative layers behind every page: the frame glow, then the dot sphere on striking pages
 * (site-backdrop R1, decision 0018). Same z-index, so the later sphere paints over the frame; the
 * frame stays the same element when the kind changes, so it never re-mounts.
 */
export function Backdrop({ kind }: { kind: BackdropKind }) {
  return (
    <>
      <div aria-hidden="true" className={cx(styles.layer, styles.frameGlow)} />
      {kind === "striking" && <SphereCanvas />}
    </>
  );
}
