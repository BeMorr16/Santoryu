import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False in prerendered HTML and while hydrating, then true: the useEffectiveTheme pattern, so
 * controls that need JavaScript render only once it runs, with no hydration mismatch (R1.4).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
