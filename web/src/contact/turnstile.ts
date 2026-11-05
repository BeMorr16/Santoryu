import { turnstileSiteKey } from "../site.config.ts";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/**
 * Covers a script that stalls or a callback that never fires. It doesn't run while Cloudflare is
 * waiting for the visitor: that would be a time limit on them (WCAG 2.2.1).
 */
const SILENT_LIMIT_MS = 120_000;
/** Cloudflare's widget is designed for this width; below it, the compact one fits (WCAG 1.4.10). */
const NORMAL_WIDGET_PX = 300;
/** Cloudflare's always-passing test key, for local development. Never in the production bundle. */
const siteKey = import.meta.env.DEV ? "1x00000000000000000000AA" : turnstileSiteKey;

export type WidgetTheme = "light" | "dark" | "auto";

interface RenderOptions {
  sitekey: string;
  action: string;
  appearance: "interaction-only";
  retry: "never";
  "refresh-expired": "never";
  "refresh-timeout": "auto";
  size: "normal" | "compact";
  theme: WidgetTheme;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "before-interactive-callback": () => void;
  "after-interactive-callback": () => void;
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

export interface ChallengeCallbacks {
  /** Cloudflare needs the visitor to act, so the form should say so. */
  onInteractive?: () => void;
  onInteractiveEnd?: () => void;
}

/**
 * Gets one token by rendering a widget for this attempt and removing it afterwards, so a token is
 * used within seconds of being issued and never twice (R5.2, R5.5). Rejects on any failure (R5.4).
 */
export function requestToken(
  container: HTMLElement,
  { onInteractive, onInteractiveEnd }: ChallengeCallbacks = {},
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let widgetId: string | undefined;
    let limit: ReturnType<typeof setTimeout>;

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(limit);
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
      settle();
    };
    const failWith = (error: Error) => {
      finish(() => {
        reject(error);
      });
    };
    const fail = () => {
      failWith(new Error("The challenge failed."));
    };
    const startLimit = () => {
      limit = setTimeout(fail, SILENT_LIMIT_MS);
    };

    startLimit();
    loadTurnstile().then(() => {
      if (settled) return;
      const turnstile = window.turnstile;
      if (!turnstile) {
        failWith(new Error("Turnstile isn't available."));
        return;
      }
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        action: "contact",
        appearance: "interaction-only",
        retry: "never",
        "refresh-expired": "never",
        // Cloudflare refreshes the check itself, which gives the visitor more time.
        "refresh-timeout": "auto",
        size:
          container.clientWidth < NORMAL_WIDGET_PX && container.clientWidth > 0
            ? "compact"
            : "normal",
        theme: widgetTheme(),
        callback: (token) => {
          finish(() => {
            resolve(token);
          });
        },
        "error-callback": fail,
        "expired-callback": fail,
        "timeout-callback": fail,
        "before-interactive-callback": () => {
          clearTimeout(limit);
          onInteractive?.();
        },
        "after-interactive-callback": () => {
          startLimit();
          onInteractiveEnd?.();
        },
      });
    }, failWith);
  });
}
