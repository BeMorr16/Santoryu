import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { accordionShowcase } from "../../../design-system/components/showcases/accordion.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(accordionShowcase);
export const links = () => componentPageLinks(accordionShowcase);

export default function AccordionPage() {
  return <ComponentPage showcase={accordionShowcase} />;
}
