import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { typographyShowcase } from "../../../design-system/components/showcases/typography.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(typographyShowcase);
export const links = () => componentPageLinks(typographyShowcase);

export default function TypographyPage() {
  return <ComponentPage showcase={typographyShowcase} />;
}
