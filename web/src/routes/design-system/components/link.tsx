import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { linkShowcase } from "../../../design-system/components/showcases/link.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(linkShowcase);
export const links = () => componentPageLinks(linkShowcase);

export default function LinkPage() {
  return <ComponentPage showcase={linkShowcase} />;
}
