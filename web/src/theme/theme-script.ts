import { CUSTOM_THEMES_KEY } from "./custom-themes.ts";
import { STORAGE_KEY } from "./preference.ts";

/**
 * Rendered first in <head>, before any stylesheet (R13.4; React hoists meta tags above it):
 * applies a stored theme before the first paint, and marks the page as having JavaScript so the
 * switcher can show (R13.9). A custom theme (theme-creator R9.3) is checked as custom-themes.ts
 * checks it, minus the known-name list: each entry must be a `--name` with a short string value
 * that can't end a declaration. Anything wrong applies nothing, and the OS scheme shows.
 * Its CSP hash is added by the build's site manifest (R13.10). Keep it ES5 and tiny.
 */
export const themeScript = `(function () {
  var d = document.documentElement;
  d.setAttribute("data-js", "");
  try {
    var p = localStorage.getItem("${STORAGE_KEY}");
    if (p === "light" || p === "dark") d.setAttribute("data-theme", p);
    if (!p || p.indexOf("custom:") !== 0) return;
    var s = JSON.parse(localStorage.getItem("${CUSTOM_THEMES_KEY}"));
    var t, i, k, v, n = 0;
    for (i = 0; s.v === 1 && i < s.themes.length; i++) {
      if (s.themes[i].id === p.slice(7)) t = s.themes[i];
    }
    if (!t || !t.vars || (t.scheme !== "light" && t.scheme !== "dark")) return;
    for (k in t.vars) {
      v = t.vars[k];
      n++;
      if (!/^--[a-z0-9-]+$/.test(k) || typeof v !== "string" || v.length > 200 || /[;{}]/.test(v)) return;
    }
    if (n > 600) return;
    d.setAttribute("data-theme", t.scheme);
    d.setAttribute("data-custom-theme", t.id);
    for (k in t.vars) d.style.setProperty(k, t.vars[k]);
  } catch (e) {}
})();`;
