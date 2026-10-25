import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { iconShowcase } from "../../../design-system/components/showcases/icon.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(iconShowcase);
export const links = () => componentPageLinks(iconShowcase);

export default function IconPage() {
  return <ComponentPage showcase={iconShowcase} />;
}
