import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { badgeShowcase } from "../../../design-system/components/showcases/badge.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(badgeShowcase);
export const links = () => componentPageLinks(badgeShowcase);

export default function BadgePage() {
  return <ComponentPage showcase={badgeShowcase} />;
}
