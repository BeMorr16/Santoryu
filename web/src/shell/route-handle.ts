import type { ComponentType } from "react";
import { useMatches } from "react-router";

/** What a route module's `handle` export can ask of the site shell (ds-components design §4). */
export interface RouteHandle {
  /** Rendered before `main`, outside it, as a side column on wide screens. */
  Aside?: ComponentType;
  /** False hides the site's Back to top button on this route. */
  backToTop?: boolean;
}

/** An object whose shell fields, where present, have the right types. */
export function isRouteHandle(handle: unknown): handle is RouteHandle {
  if (typeof handle !== "object" || handle === null) return false;
  const Aside = "Aside" in handle ? handle.Aside : undefined;
  const backToTop = "backToTop" in handle ? handle.backToTop : undefined;
  return (
    (Aside === undefined || typeof Aside === "function") &&
    (backToTop === undefined || typeof backToTop === "boolean")
  );
}

/** Merges the matched routes' handles, root to leaf; the deepest route wins. */
export function useRouteHandle(): RouteHandle {
  const merged: RouteHandle = {};
  for (const { handle } of useMatches()) {
    if (!isRouteHandle(handle)) continue;
    if (handle.Aside !== undefined) merged.Aside = handle.Aside;
    if (handle.backToTop !== undefined) merged.backToTop = handle.backToTop;
  }
  return merged;
}
