import { Link } from "../../components/Link/Link.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { pageMeta } from "../../design-system/page-meta.ts";

export const designSystemPages = [
  {
    href: "/design-system/tokens",
    title: "Tokens",
    description: "Every design token behind this site, with its light and dark values.",
  },
  {
    href: "/design-system/components",
    title: "Components",
    description:
      "The component library: live examples, props, styling hooks and accessibility notes.",
  },
] as const;

const page = pageMeta(
  "/design-system",
  "Design System",
  "The design system behind this site: its tokens and its component library.",
);
export const meta = page.meta;
export const links = page.links;

export default function DesignSystem() {
  return (
    <>
      <h1>Design System</h1>
      <p>
        The design system this site is built from: the tokens that set every color, size and motion,
        and the components built on them.
      </p>
      <Stack as="ul" gap="md">
        {designSystemPages.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.title}</Link>
            <p>{item.description}</p>
          </li>
        ))}
      </Stack>
    </>
  );
}
