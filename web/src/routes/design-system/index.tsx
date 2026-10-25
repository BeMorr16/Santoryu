import { HubPage } from "../../design-system/hub/HubPage.tsx";
import { pageMeta } from "../../design-system/page-meta.ts";

const page = pageMeta(
  "/design-system",
  "Design System",
  "The design system behind this site: its tokens, its component library with live examples, and a theme creator for building your own theme.",
);
export const meta = page.meta;
export const links = page.links;

export default function DesignSystem() {
  return <HubPage />;
}
