import { turnstileSiteKey } from "../site.config.ts";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Covers a callback that never fires. Long enough for someone to answer an interactive challenge. */
const OVERALL_LIMIT_MS = 120_000;
/** Cloudflare's always-passing test key, for local development. Never in the production bundle. */
const siteKey = import.meta.env.DEV ? "1x00000000000000000000AA" : turnstileSiteKey;

export type WidgetTheme = "light" | "dark" | "auto";

interface RenderOptions {
  sitekey: string;
  action: string;
  appearance: "interaction-only";
  retry: "never";
  "refresh-expired": "never";
  theme: WidgetTheme;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: RenderOptions) => string | undefined;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;

/**
 * Loads Cloudflare's script once. The form calls this on first focus, so a visitor who only reads
 * the page makes no request to Cloudflare (R5.1). A failure clears the cache, so a later attempt
 * can retry.
 */
export function loadTurnstile(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      script.remove();
      loading = null;
      reject(new Error("Turnstile failed to load."));
    };
    document.head.append(script);
  });
  return loading;
}

/** The widget follows the site's resolved theme, custom themes included, or `auto` if it's unclear. */
function widgetTheme(): WidgetTheme {
  const scheme = getComputedStyle(document.documentElement).colorScheme;
  return scheme === "light" || scheme === "dark" ? scheme : "auto";
}

/**
 * Gets one token by rendering a widget for this attempt and removing it afterwards, so a token is
 * used within seconds of being issued and never twice (R5.2, R5.5). Rejects on any failure (R5.4).
 */
export async function requestToken(container: HTMLElement): Promise<string> {
  await loadTurnstile();
  const turnstile = window.turnstile;
  if (!turnstile) throw new Error("Turnstile isn't available.");

  return new Promise<string>((resolve, reject) => {
    const finish = (settle: () => void) => {
      clearTimeout(limit);
      if (widgetId !== undefined) turnstile.remove(widgetId);
      settle();
    };
    const fail = () => {
      finish(() => {
        reject(new Error("The challenge failed."));
      });
    };
    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      action: "contact",
      appearance: "interaction-only",
      retry: "never",
      "refresh-expired": "never",
      theme: widgetTheme(),
      callback: (token) => {
        finish(() => {
          resolve(token);
        });
      },
      "error-callback": fail,
      "expired-callback": fail,
      "timeout-callback": fail,
    });
    const limit = setTimeout(fail, OVERALL_LIMIT_MS);
  });
}
