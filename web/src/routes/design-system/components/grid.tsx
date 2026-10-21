import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { gridShowcase } from "../../../design-system/components/showcases/grid.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(gridShowcase);
export const links = () => componentPageLinks(gridShowcase);

export default function GridPage() {
  return <ComponentPage showcase={gridShowcase} />;
}
