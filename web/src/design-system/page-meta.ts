import type { LinkDescriptor, MetaDescriptor } from "react-router";
import { siteName, siteUrl } from "../site.config.ts";

/**
 * A design-system route's `meta` and `links`: the title, ending in the site name (R1.5), the
 * description, and the canonical URL (R1.1).
 */
export function pageMeta(path: string, title: string, description: string) {
  return {
    meta: (): MetaDescriptor[] => [
      { title: `${title} · ${siteName}` },
      { name: "description", content: description },
    ],
    links: (): LinkDescriptor[] => [{ rel: "canonical", href: `${siteUrl}${path}` }],
  };
}
