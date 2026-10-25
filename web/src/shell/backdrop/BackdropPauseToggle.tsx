import { useSyncExternalStore } from "react";
import { Button } from "../../components/Button/Button.tsx";
import styles from "./Backdrop.module.css";
import {
  readBackdropPaused,
  subscribeBackdropPaused,
  writeBackdropPaused,
} from "./motion-preference.ts";

/**
 * Pauses and resumes the sphere (site-backdrop R6.7, WCAG 2.2.2). An APG toggle button: its name
 * stays the same and `aria-pressed` carries the state; the icon shows what it does next.
 */
export function BackdropPauseToggle() {
  // Not paused on the server and during hydration; the saved choice applies right after.
  const paused = useSyncExternalStore(subscribeBackdropPaused, readBackdropPaused, () => false);
  return (
    <Button
      variant="ghost"
      size="sm"
      iconStart={paused ? "play" : "pause"}
      aria-label="Pause background animation"
      aria-pressed={paused}
      className={styles.pause}
      onClick={() => {
        writeBackdropPaused(!paused);
      }}
    />
  );
}
