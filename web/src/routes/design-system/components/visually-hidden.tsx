import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { visuallyHiddenShowcase } from "../../../design-system/components/showcases/visually-hidden.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(visuallyHiddenShowcase);
export const links = () => componentPageLinks(visuallyHiddenShowcase);

export default function VisuallyHiddenPage() {
  return <ComponentPage showcase={visuallyHiddenShowcase} />;
}
