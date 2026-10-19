import { Link } from "../components/Link/Link.tsx";
import { homeContent } from "../content/home.ts";
import { siteUrl } from "../site.config.ts";
import type { Route } from "./+types/home";
import styles from "./home.module.css";

export function meta(): Route.MetaDescriptors {
  return [{ title: homeContent.title }, { name: "description", content: homeContent.description }];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/` }];
}

export default function Home() {
  return (
    <>
      <h1>{homeContent.name}</h1>
      <p className={styles.intro}>{homeContent.intro}</p>
      <p>
        <Link href="/lab">{homeContent.labLinkText}</Link>
      </p>
    </>
  );
}
