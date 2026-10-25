import { pageMeta } from "../../design-system/page-meta.ts";
import { TokensPage } from "../../design-system/tokens/TokensPage.tsx";

const page = pageMeta(
  "/design-system/tokens",
  "Tokens · Design System",
  "Every design token behind this site: a diagram of how they flow, then every primitive, semantic and component token.",
);
export const meta = page.meta;
export const links = page.links;

export default function Tokens() {
  return <TokensPage />;
}
