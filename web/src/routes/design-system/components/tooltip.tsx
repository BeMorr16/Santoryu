import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { tooltipShowcase } from "../../../design-system/components/showcases/tooltip.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(tooltipShowcase);
export const links = () => componentPageLinks(tooltipShowcase);

export default function TooltipPage() {
  return <ComponentPage showcase={tooltipShowcase} />;
}
