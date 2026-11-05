import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { contactHref } from "../src/shell/nav.ts";

/** The not-found page is prerendered at /404 but is noindex, so it is never listed. */
const unlistedRoutes = new Set(["/404"]);

/** sitemaps.org 0.9 sitemap of each route's canonical URL (decision 0003: no trailing slash). */
export function renderSitemap(routes: readonly string[], siteUrl: string): string {
  const urls = routes
    .filter((route) => !unlistedRoutes.has(route))
    .map((route) => `  <url><loc>${siteUrl}${route}</loc></url>\n`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    "</urlset>\n"
  );
}

export function renderRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

const securityTxtExpiryDays = 364;

/**
 * RFC 9116, pointing at the contact page, so no email is published (contact-form R14). `Expires` is
 * under a year out, as the RFC recommends, and every deploy renews it. It's a date, not a time, so
 * rebuilding on the same day gives the same file.
 */
export function renderSecurityTxt(siteUrl: string, now: Date): string {
  const expires = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + securityTxtExpiryDays),
  );
  return (
    `Contact: ${siteUrl}${contactHref}\n` +
    `Expires: ${expires.toISOString()}\n` +
    "Preferred-Languages: en\n"
  );
}

export async function writeCrawlFiles(
  clientDir: string,
  routes: readonly string[],
  siteUrl: string,
  now: Date = new Date(),
): Promise<void> {
  await writeFile(join(clientDir, "sitemap.xml"), renderSitemap(routes, siteUrl));
  await writeFile(join(clientDir, "robots.txt"), renderRobots(siteUrl));
  await mkdir(join(clientDir, ".well-known"), { recursive: true });
  await writeFile(join(clientDir, ".well-known/security.txt"), renderSecurityTxt(siteUrl, now));
}
