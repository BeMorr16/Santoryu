import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { tableShowcase } from "../../../design-system/components/showcases/table.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(tableShowcase);
export const links = () => componentPageLinks(tableShowcase);

export default function TablePage() {
  return <ComponentPage showcase={tableShowcase} />;
}
