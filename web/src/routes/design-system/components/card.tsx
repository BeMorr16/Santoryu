import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { cardShowcase } from "../../../design-system/components/showcases/card.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(cardShowcase);
export const links = () => componentPageLinks(cardShowcase);

export default function CardPage() {
  return <ComponentPage showcase={cardShowcase} />;
}
