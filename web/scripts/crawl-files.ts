import { writeFile } from "node:fs/promises";
import { join } from "node:path";

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

export async function writeCrawlFiles(
  clientDir: string,
  routes: readonly string[],
  siteUrl: string,
): Promise<void> {
  await writeFile(join(clientDir, "sitemap.xml"), renderSitemap(routes, siteUrl));
  await writeFile(join(clientDir, "robots.txt"), renderRobots(siteUrl));
}
