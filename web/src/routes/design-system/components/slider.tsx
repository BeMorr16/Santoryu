import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { sliderShowcase } from "../../../design-system/components/showcases/slider.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(sliderShowcase);
export const links = () => componentPageLinks(sliderShowcase);

export default function SliderPage() {
  return <ComponentPage showcase={sliderShowcase} />;
}
