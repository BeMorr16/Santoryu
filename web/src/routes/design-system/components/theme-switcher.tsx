import {
  ComponentPage,
  componentPageLinks,
  componentPageMeta,
} from "../../../design-system/components/ComponentPage.tsx";
import { docsHandle } from "../../../design-system/components/docs-handle.ts";
import { themeSwitcherShowcase } from "../../../design-system/components/showcases/theme-switcher.tsx";

export const handle = docsHandle;
export const meta = () => componentPageMeta(themeSwitcherShowcase);
export const links = () => componentPageLinks(themeSwitcherShowcase);

export default function ThemeSwitcherPage() {
  return <ComponentPage showcase={themeSwitcherShowcase} />;
}
