import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { siteName, siteUrl } from "../site.config.ts";
import type { Route } from "./+types/lab";

export const labPages = [
  {
    href: "/lab/tokens",
    title: "Tokens",
    description: "Every design token behind this site, with its light and dark values.",
  },
  {
    href: "/lab/components",
    title: "Components",
    description:
      "The component library: live examples, props, styling hooks and accessibility notes.",
  },
] as const;

export function meta(): Route.MetaDescriptors {
  return [
    { title: `Lab · ${siteName}` },
    {
      name: "description",
      content: "The design system behind this site: its tokens and its component library.",
    },
  ];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/lab` }];
}

export default function Lab() {
  return (
    <>
      <h1>Lab</h1>
      <p>
        The design system this site is built from: the tokens that set every color, size and motion,
        and the components built on them.
      </p>
      <Stack as="ul" gap="md">
        {labPages.map((page) => (
          <li key={page.href}>
            <Link href={page.href}>{page.title}</Link>
            <p>{page.description}</p>
          </li>
        ))}
      </Stack>
    </>
  );
}
