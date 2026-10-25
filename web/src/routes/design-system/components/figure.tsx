import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { figureShowcase } from "../../../design-system/components/showcases/figure.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(figureShowcase);
export const links = () => componentPageLinks(figureShowcase);

export default function FigurePage() {
  return <ComponentPage showcase={figureShowcase} />;
}
