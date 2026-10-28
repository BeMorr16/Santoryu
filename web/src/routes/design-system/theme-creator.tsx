import { themeCreatorPath } from "../../design-system/components/pages.ts";
import { pageMeta } from "../../shell/page-meta.ts";
import { ThemeCreatorPage } from "../../design-system/theme-creator/ThemeCreatorPage.tsx";

const page = pageMeta(
  themeCreatorPath,
  "Theme Creator · Design System",
  "Build a theme from this site's design tokens, see it on real components, use it across the site and export it as design tokens.",
);
export const meta = page.meta;
export const links = page.links;

export default function ThemeCreator() {
  return <ThemeCreatorPage />;
}
