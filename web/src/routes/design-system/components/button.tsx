import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { buttonShowcase } from "../../../design-system/components/showcases/button.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(buttonShowcase);
export const links = () => componentPageLinks(buttonShowcase);

export default function ButtonPage() {
  return <ComponentPage showcase={buttonShowcase} />;
}
