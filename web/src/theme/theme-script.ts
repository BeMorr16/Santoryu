import { STORAGE_KEY } from "./preference.ts";

/**
 * Rendered first in <head>, before any stylesheet (R13.4; React hoists meta tags above it): applies a stored light/dark preference before
 * the first paint, and marks the page as having JavaScript so the switcher can show (R13.9).
 * Its CSP hash is added by the build's site manifest (R13.10). Keep it ES5 and tiny.
 */
export const themeScript = `(function () {
  var d = document.documentElement;
  d.setAttribute("data-js", "");
  try {
    var p = localStorage.getItem("${STORAGE_KEY}");
    if (p === "light" || p === "dark") d.setAttribute("data-theme", p);
  } catch (e) {}
})();`;
