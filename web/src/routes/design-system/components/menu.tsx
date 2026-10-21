import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { menuShowcase } from "../../../design-system/components/showcases/menu.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(menuShowcase);
export const links = () => componentPageLinks(menuShowcase);

export default function MenuPage() {
  return <ComponentPage showcase={menuShowcase} />;
}
