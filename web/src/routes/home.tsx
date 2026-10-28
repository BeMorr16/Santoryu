import { homeContent, homeTitle } from "../content/home.ts";
import { HomePage } from "../home/HomePage.tsx";
import { homeStructuredData } from "../home/structured-data.ts";
import { documentMeta } from "../shell/page-meta.ts";
import type { RouteHandle } from "../shell/route-handle.ts";
import type { Route } from "./+types/home";

export const handle = { backdrop: "striking" } satisfies RouteHandle;

const page = documentMeta("/", homeTitle, homeContent.description);

export function meta(): Route.MetaDescriptors {
  return [...page.meta(), { "script:ld+json": homeStructuredData }];
}

export const links = page.links;

export default function Home() {
  return <HomePage />;
}
