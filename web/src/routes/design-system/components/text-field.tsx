import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { textFieldShowcase } from "../../../design-system/components/showcases/text-field.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(textFieldShowcase);
export const links = () => componentPageLinks(textFieldShowcase);

export default function TextFieldPage() {
  return <ComponentPage showcase={textFieldShowcase} />;
}
