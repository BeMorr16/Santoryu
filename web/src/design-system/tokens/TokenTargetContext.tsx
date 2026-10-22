import { createContext, useEffect } from "react";

/**
 * Opens the group holding a token row, given the row's fragment id, and says whether the id names
 * a token row. The tokens page's reference provides it (ds-tokens §7); elsewhere it does nothing.
 */
export type Reveal = (rowId: string) => boolean;

export const TokenTargetContext = createContext<Reveal>(() => false);

/**
 * Opens and scrolls to the token row the URL fragment names, on load and on `hashchange` (back,
 * forward, a typed fragment), since the browser can't scroll to a row in a closed group (R7.2).
 * The location is an external system, so this is an effect.
 */
export function useHashTarget(reveal: Reveal) {
  useEffect(() => {
    const target = () => {
      // Row ids are plain ASCII, so the raw fragment is compared; a malformed one just never matches.
      const id = window.location.hash.slice(1);
      if (id === "" || !reveal(id)) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    // A frame after hydration: reveal flushes a render, which React can't do inside an effect.
    const frame = requestAnimationFrame(target);
    window.addEventListener("hashchange", target);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", target);
    };
  }, [reveal]);
}
