/**
 * The one source of truth for response security headers (static-hosting design §5.1). The edge
 * functions get these values injected at synth time, so nothing is duplicated in functions/.
 */

/** Sent on every function-handled response, including function-generated redirects. */
export const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
} as const;

/** Directives after script-src. `style-src-attr` is for the /lab specimens' style attributes and Figure's `--_ratio` (refinement R18.5). */
const AFTER_SCRIPT_SRC = [
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

/** The policy around the point where `'sha256-…'` sources are inserted into script-src. */
export function cspParts(): { prefix: string; suffix: string } {
  return {
    prefix: "default-src 'none'; script-src 'self'",
    suffix: `; ${AFTER_SCRIPT_SRC.join("; ")}`,
  };
}

/** The Content-Security-Policy for a page whose inline scripts have these `sha256-…` hashes. */
export function buildCsp(scriptHashes: readonly string[]): string {
  const { prefix, suffix } = cspParts();
  return prefix + scriptHashes.map((hash) => ` '${hash}'`).join("") + suffix;
}
