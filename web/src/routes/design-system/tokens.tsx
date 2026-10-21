import { BackToDesignSystem } from "../../design-system/BackToDesignSystem.tsx";
import { pageMeta } from "../../design-system/page-meta.ts";
import { TokenGallery } from "../../design-system/TokenGallery.tsx";

const page = pageMeta(
  "/design-system/tokens",
  "Tokens · Design System",
  "Every design token behind this site, with its light and dark values.",
);
export const meta = page.meta;
export const links = page.links;

export default function Tokens() {
  return (
    <>
      <BackToDesignSystem />
      <h1>Tokens</h1>
      <p>
        The design tokens this site is built from. Each one is listed with its light and dark
        values, the primitive it comes from, and a preview styled by the token itself.
      </p>
      <TokenGallery />
    </>
  );
}
