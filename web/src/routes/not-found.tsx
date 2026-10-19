import { Link } from "../components/Link/Link.tsx";
import { siteName } from "../site.config.ts";
import type { Route } from "./+types/not-found";

export function meta(): Route.MetaDescriptors {
  return [
    { title: `Page not found · ${siteName}` },
    { name: "description", content: "The page you were looking for doesn't exist." },
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>The page you were looking for doesn't exist or has moved.</p>
      <p>
        <Link href="/">Go to the home page</Link>
      </p>
    </>
  );
}
