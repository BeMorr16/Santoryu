import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { Overview } from "../../../design-system/components/Overview.tsx";
import { componentsPath } from "../../../design-system/components/pages.ts";
import { pageMeta } from "../../../design-system/page-meta.ts";

const page = pageMeta(
  componentsPath,
  "Components · Design System",
  "The component library behind this site: its principles, how to use it and how it's tested.",
);
export const handle = docsHandle;
export const meta = page.meta;
export const links = page.links;

export default function Components() {
  return <Overview />;
}
