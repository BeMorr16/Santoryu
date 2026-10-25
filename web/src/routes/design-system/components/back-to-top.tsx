import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { backToTopShowcase } from "../../../design-system/components/showcases/back-to-top.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(backToTopShowcase);
export const links = () => componentPageLinks(backToTopShowcase);

export default function BackToTopPage() {
  return <ComponentPage showcase={backToTopShowcase} />;
}
