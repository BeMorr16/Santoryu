import { Link } from "../components/Link/Link.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { homeContent } from "../content/home.ts";
import { siteUrl } from "../site.config.ts";
import type { Route } from "./+types/home";

export function meta(): Route.MetaDescriptors {
  return [{ title: homeContent.title }, { name: "description", content: homeContent.description }];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/` }];
}

export default function Home() {
  return (
    <>
      <Typography as="h1" variant="display">
        {homeContent.name}
      </Typography>
      <Typography variant="lead" tone="muted">
        {homeContent.intro}
      </Typography>
      <p>
        <Link href="/lab">{homeContent.labLinkText}</Link>
      </p>
    </>
  );
}
