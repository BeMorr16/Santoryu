import { TokenGallery } from "../lab/TokenGallery.tsx";
import { siteName, siteUrl } from "../site.config.ts";
import type { Route } from "./+types/lab";

export function meta(): Route.MetaDescriptors {
  return [
    { title: `Lab · ${siteName}` },
    {
      name: "description",
      content: "Every design token behind this site, with its light and dark values.",
    },
  ];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/lab` }];
}

export default function Lab() {
  return (
    <>
      <h1>Lab</h1>
      <p>
        The design tokens this site is built from. Each one is listed with its light and dark
        values, the primitive it comes from, and a preview styled by the token itself.
      </p>
      <TokenGallery />
    </>
  );
}
