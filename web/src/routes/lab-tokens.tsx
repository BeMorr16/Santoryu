import { BackToLab } from "../lab/BackToLab.tsx";
import { TokenGallery } from "../lab/TokenGallery.tsx";
import { siteName, siteUrl } from "../site.config.ts";
import type { Route } from "./+types/lab-tokens";

export function meta(): Route.MetaDescriptors {
  return [
    { title: `Tokens · Lab · ${siteName}` },
    {
      name: "description",
      content: "Every design token behind this site, with its light and dark values.",
    },
  ];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/lab/tokens` }];
}

export default function LabTokens() {
  return (
    <>
      <BackToLab />
      <h1>Tokens</h1>
      <p>
        The design tokens this site is built from. Each one is listed with its light and dark
        values, the primitive it comes from, and a preview styled by the token itself.
      </p>
      <TokenGallery />
    </>
  );
}
