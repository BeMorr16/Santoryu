import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { dialogShowcase } from "../../../design-system/components/showcases/dialog.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(dialogShowcase);
export const links = () => componentPageLinks(dialogShowcase);

export default function DialogPage() {
  return <ComponentPage showcase={dialogShowcase} />;
}
