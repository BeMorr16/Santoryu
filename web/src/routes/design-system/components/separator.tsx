import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { separatorShowcase } from "../../../design-system/components/showcases/separator.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(separatorShowcase);
export const links = () => componentPageLinks(separatorShowcase);

export default function SeparatorPage() {
  return <ComponentPage showcase={separatorShowcase} />;
}
