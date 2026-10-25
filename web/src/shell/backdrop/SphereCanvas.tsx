import { useEffect, useRef, useState } from "react";
import { cx } from "../../components/shared/cx.ts";
import styles from "./Backdrop.module.css";

/**
 * The striking backdrop (site-backdrop design §6.1): a canvas in the prerendered page, drawn after
 * hydration by the sphere engine, a separate chunk only striking pages load (R5.7). It fades in
 * once the first frame is drawn (R2.9).
 */
export function SphereCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stop: (() => void) | undefined;
    let active = true;
    import("./sphere/start-sphere.ts")
      .then(({ startSphere }) => {
        if (active) {
          stop = startSphere(canvas, {
            onFirstFrame: () => {
              setReady(true);
            },
          });
        }
      })
      // A chunk that fails to load (offline, or a stale page after a deploy) leaves the page color (R6.4).
      .catch(() => undefined);
    return () => {
      active = false;
      stop?.();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cx(styles.layer, styles.sphere, ready && styles.ready)}
    />
  );
}
