import { readFileSync } from "node:fs";
import { cspParts, SECURITY_HEADERS } from "./security-headers.ts";

/** CloudFront Functions reject code over 10 KB. */
const MAX_FUNCTION_BYTES = 10_240;
const PLACEHOLDER = "var CONFIG = __CONFIG__;";

function render(file: string, config: unknown): string {
  const source = readFileSync(new URL(`../functions/${file}`, import.meta.url), "utf8");
  if (source.split(PLACEHOLDER).length !== 2) {
    throw new Error(`functions/${file} must contain "${PLACEHOLDER}" exactly once.`);
  }
  const code = source.replace(PLACEHOLDER, () => `var CONFIG = ${JSON.stringify(config)};`);
  const bytes = Buffer.byteLength(code);
  if (bytes > MAX_FUNCTION_BYTES) {
    throw new Error(
      `functions/${file} renders to ${String(bytes)} bytes, over the ` +
        `${String(MAX_FUNCTION_BYTES)}-byte CloudFront Functions limit.`,
    );
  }
  return code;
}

export interface ViewerRequestConfig {
  /** The canonical host. Every other host is redirected to it. */
  apex: string;
  /** Published files outside /assets/, from the site manifest. */
  files: readonly string[];
}

/** Viewer-request code: host and URL canonicalization, routing to pages, and 404 rewrites. */
export function renderViewerRequest(config: ViewerRequestConfig): string {
  return render("viewer-request.js", { ...config, headers: SECURITY_HEADERS });
}

/** Viewer-response code: security headers, the per-page CSP, and the not-found status. */
export function renderViewerResponse(): string {
  const { prefix, suffix } = cspParts();
  return render("viewer-response.js", {
    headers: SECURITY_HEADERS,
    cspPrefix: prefix,
    cspSuffix: suffix,
  });
}
