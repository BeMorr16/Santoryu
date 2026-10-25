import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { stackShowcase } from "../../../design-system/components/showcases/stack.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(stackShowcase);
export const links = () => componentPageLinks(stackShowcase);

export default function StackPage() {
  return <ComponentPage showcase={stackShowcase} />;
}
