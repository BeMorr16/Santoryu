import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { colorFieldShowcase } from "../../../design-system/components/showcases/color-field.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(colorFieldShowcase);
export const links = () => componentPageLinks(colorFieldShowcase);

export default function ColorFieldPage() {
  return <ComponentPage showcase={colorFieldShowcase} />;
}
