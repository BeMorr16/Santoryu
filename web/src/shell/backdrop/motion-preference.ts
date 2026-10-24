/**
 * Whether the visitor paused the sphere with the header's toggle (site-backdrop R6.7, design §6.6),
 * kept across visits like the theme choice (theme/preference.ts).
 */
export const MOTION_STORAGE_KEY = "backdrop-motion";
const PAUSED = "paused";

/** A choice storage refused to hold, so it still applies for this page. */
let pageChoice: boolean | undefined;

const listeners = new Set<() => void>();

/** Whether the sphere is paused. Never throws. */
export function readBackdropPaused(): boolean {
  if (pageChoice !== undefined) return pageChoice;
  try {
    return localStorage.getItem(MOTION_STORAGE_KEY) === PAUSED;
  } catch {
    return false;
  }
}

/** Stores the choice (if storage allows), then notifies subscribers. */
export function writeBackdropPaused(paused: boolean): void {
  try {
    if (paused) localStorage.setItem(MOTION_STORAGE_KEY, PAUSED);
    else localStorage.removeItem(MOTION_STORAGE_KEY);
    pageChoice = undefined;
  } catch {
    // Storage is unavailable or full: the choice lasts for this page only.
    pageChoice = paused;
  }
  for (const listener of listeners) listener();
}

/** Calls `listener` when the choice changes, on this page or in another tab. */
export function subscribeBackdropPaused(listener: () => void): () => void {
  // `key` is null when another tab clears storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== MOTION_STORAGE_KEY) return;
    pageChoice = undefined;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
