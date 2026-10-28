import type { LinkDescriptor, MetaDescriptor } from "react-router";
import { homeContent } from "../content/home.ts";
import { ownerName, siteName, siteUrl } from "../site.config.ts";

/** The link-preview image every indexable page shares (home R7.1, R7.4). */
export const previewImage = {
  url: `${siteUrl}/og-image.png`,
  width: 1200,
  height: 630,
  alt: `${ownerName}, ${homeContent.role}, ${new URL(siteUrl).host}`,
};

/** Every indexable page's head: title, description, canonical, link-preview tags (R7.1, R7.2). */
export function documentMeta(path: string, title: string, description: string) {
  const url = `${siteUrl}${path}`;
  return {
    meta: (): MetaDescriptor[] => [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: previewImage.url },
      { property: "og:image:width", content: String(previewImage.width) },
      { property: "og:image:height", content: String(previewImage.height) },
      { property: "og:image:alt", content: previewImage.alt },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: (): LinkDescriptor[] => [{ rel: "canonical", href: url }],
  };
}

/** A page titled "<title> · <siteName>" (unchanged signature for existing callers). */
export function pageMeta(path: string, title: string, description: string) {
  return documentMeta(path, `${title} · ${siteName}`, description);
}
