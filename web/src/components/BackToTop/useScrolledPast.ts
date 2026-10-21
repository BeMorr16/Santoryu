import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/**
 * Whether the page is scrolled further than `threshold` pixels (default: the viewport's height).
 * The snapshot is a boolean, so a component re-renders only when the threshold is crossed. False
 * on the server and during hydration.
 */
export function useScrolledPast(threshold?: number): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > (threshold ?? window.innerHeight),
    () => false,
  );
}
