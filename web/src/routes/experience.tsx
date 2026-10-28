import { experienceContent } from "../content/experience.ts";
import { ExperiencePage } from "../experience/ExperiencePage.tsx";
import { experienceHref } from "../shell/nav.ts";
import { pageMeta } from "../shell/page-meta.ts";
import type { RouteHandle } from "../shell/route-handle.ts";

// "quiet" is the default, written out so the choice is visible (design §5.1).
export const handle = { backdrop: "quiet" } satisfies RouteHandle;

const page = pageMeta(experienceHref, experienceContent.heading, experienceContent.description);

export const meta = page.meta;
export const links = page.links;

export default function Experience() {
  return <ExperiencePage />;
}
