import { Link, type LinkOwnProps } from "../../../components/Link/Link.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import { buttonLookDocs } from "./button.tsx";

const props = {
  href: {
    type: "string",
    description: "Required. A /path routes client-side; anything else is a plain link.",
  },
  newTab: {
    type: "boolean",
    default: "false",
    description: 'Opens in a new tab, with an icon and "(opens in new tab)" in its name.',
  },
  appearance: {
    type: '"inline" | "button"',
    default: '"inline"',
    description: "inline is an underlined text link; button looks like a Button.",
  },
  variant: { ...buttonLookDocs.variant, description: 'With appearance="button" only.' },
  size: { ...buttonLookDocs.size, description: 'With appearance="button" only.' },
  iconStart: { ...buttonLookDocs.iconStart, description: 'With appearance="button" only.' },
  iconEnd: { ...buttonLookDocs.iconEnd, description: 'With appearance="button" only.' },
} satisfies PropDocs<LinkOwnProps>;

function Examples() {
  return (
    <>
      <Example title="Inline, in running text">
        <p>
          Read about the <Link href="/lab/tokens">design tokens</Link>, or email{" "}
          <Link href="mailto:hello@example.com">hello@example.com</Link>.
        </p>
      </Example>
      <Example title="New tab">
        <Link href="https://github.com/" newTab>
          GitHub
        </Link>
      </Example>
      <Example title="Current page">
        <Link href="/lab/components" aria-current="page">
          Components
        </Link>
      </Example>
      <Example title="As a button">
        <Link href="/lab" appearance="button" variant="primary" iconEnd="arrow-right">
          Explore the lab
        </Link>
        <Link href="https://www.linkedin.com/" appearance="button" iconStart="linkedin" newTab>
          LinkedIn
        </Link>
        <Link href="/lab/tokens" appearance="button" variant="ghost" size="sm">
          Tokens
        </Link>
      </Example>
    </>
  );
}

export const linkShowcase: Showcase = {
  id: "link",
  name: "Link",
  exports: ["Link"],
  purpose: "Navigation to another page or site, optionally styled as a button.",
  Examples,
  props: [{ part: "Link", docs: props }],
  tokens: "link",
  keyboard: [{ keys: "Enter", action: "Follows the link." }],
  a11y: [
    "Always an <a> with an href; there is no disabled link.",
    "Named by its text; new-tab links add “(opens in new tab)”.",
    "Inline links are underlined, so they're told apart from text by more than color.",
    "Set aria-current for the current page; it's shown by weight as well as color.",
  ],
};
