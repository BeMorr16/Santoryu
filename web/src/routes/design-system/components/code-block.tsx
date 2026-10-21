import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { codeBlockShowcase } from "../../../design-system/components/showcases/code-block.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(codeBlockShowcase);
export const links = () => componentPageLinks(codeBlockShowcase);

export default function CodeBlockPage() {
  return <ComponentPage showcase={codeBlockShowcase} />;
}
