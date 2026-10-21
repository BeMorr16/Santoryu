import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Link, type LinkOwnProps } from "../../../components/Link/Link.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonLookDocs } from "./button.tsx";

const routerOption = (type: string) => ({
  type,
  description: "React Router's option, for /path links only (ignored otherwise).",
});

const props = {
  href: {
    type: "string",
    description: "Required. A /path routes client-side; anything else is a plain link.",
  },
  newTab: {
    type: "boolean",
    default: "false",
    description: "Opens in a new tab, with an icon and “, opens in new tab” in its name.",
  },
  rel: {
    type: "string",
    description: 'Merged with noopener noreferrer when newTab is set, e.g. rel="me".',
  },
  appearance: {
    type: '"inline" | "button"',
    default: '"inline"',
    description: "inline is an underlined text link; button looks like a Button.",
  },
  showVisited: {
    type: "boolean",
    default: "false",
    description: "Inline only. Colors the link violet once visited.",
  },
  currentMatch: {
    type: '"exact" | "section"',
    default: '"exact"',
    description:
      'Inline only. Routed inline links set aria-current themselves: "page" on an exact match, and with "section", "true" on pages below it. Your own aria-current overrides it. The hash is ignored, so use #id hrefs for in-page links.',
  },
  underline: {
    type: '"always" | "hover"',
    default: '"always"',
    description: "Where the underline shows. Inline links only.",
  },
  variant: { ...buttonLookDocs.variant, description: 'With appearance="button" only.' },
  size: { ...buttonLookDocs.size, description: 'With appearance="button" only.' },
  iconStart: { ...buttonLookDocs.iconStart, description: 'With appearance="button" only.' },
  iconEnd: { ...buttonLookDocs.iconEnd, description: 'With appearance="button" only.' },
  nameTooltip: {
    type: "boolean",
    default: "true",
    description:
      'With appearance="button" only. An icon-only link shows its name (without the new-tab text) as a tooltip; false turns it off.',
  },
  prefetch: routerOption('"intent" | "render" | "none" | "viewport"'),
  replace: routerOption("boolean"),
  state: routerOption("any"),
  preventScrollReset: routerOption("boolean"),
  viewTransition: routerOption("boolean"),
  reloadDocument: routerOption("boolean"),
  discover: routerOption('"render" | "none"'),
} satisfies PropDocs<LinkOwnProps>;

/** The customized example's CSS, shown under it and applied by `.quietLinks`. */
export const quietLinksCss = `.quietLinks {
  --component-link-color: var(--color-text-default);
  --component-link-color-hover: var(--color-link-hover);
}`;

/** Automatic and overridden aria-current, as rendered on /lab/components (refinement R4.8). */
const currentExamples = [
  {
    link: <Link href="/lab/components">Components</Link>,
    announced: { name: "Components", role: "link, current page" },
  },
  {
    link: (
      <Link href="/lab/components" aria-current={false}>
        This page, unmarked
      </Link>
    ),
    announced: { name: "This page, unmarked", role: "link" },
  },
];

function Examples() {
  return (
    <>
      <Example title="Inline, in running text">
        <p>
          Read about the <Link href="/lab/tokens">design tokens</Link>, or email{" "}
          <Link href="mailto:hello@example.com">hello@example.com</Link>.
        </p>
      </Example>
      <Example title="New tab" layout="column">
        <p>
          <Link href="https://github.com/" newTab>
            GitHub
          </Link>
        </p>
        <p className={styles.narrow}>
          The code for this site is on{" "}
          <Link href="https://github.com/" newTab>
            GitHub
          </Link>
          .
        </p>
      </Example>
      <Example title="Visited (opt-in)" layout="column">
        <p>
          <Link href="/lab" showVisited>
            Lab
          </Link>{" "}
          and{" "}
          <Link href="/lab/tokens" showVisited>
            Design tokens
          </Link>
        </p>
        <p>Visited links turn violet.</p>
      </Example>
      <Example title="Current page" layout="column">
        {currentExamples.map(({ link, announced }) => (
          <div key={announced.name} className={styles.row}>
            {link}
            <Announced {...announced} />
          </div>
        ))}
      </Example>
      <Example title="Underline on hover">
        <Stack as="ul" direction="horizontal" aria-label="Lab pages">
          <li>
            <Link href="/lab" underline="hover">
              Lab
            </Link>
          </li>
          <li>
            <Link href="/lab/tokens" underline="hover">
              Tokens
            </Link>
          </li>
          <li>
            <Link href="/lab/components" underline="hover">
              Components
            </Link>
          </li>
        </Stack>
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
        <Link
          href="mailto:hello@example.com"
          appearance="button"
          iconStart="mail"
          aria-label="Email me"
        />
      </Example>
      <Example title="Customized with a component token" layout="column">
        <p className={styles.quietLinks}>
          Quiet links, like this <Link href="/lab/tokens">token reference</Link>, keep the underline
          but take the text color.
        </p>
        <CodeBlock label="CSS" language="css">
          {quietLinksCss}
        </CodeBlock>
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
    "Always named: inline links need text, and a button-styled link with no text needs an icon plus aria-label or aria-labelledby (a type error otherwise). Types can't see empty children such as {undefined} or a lone decorative icon, so those still need care.",
    'Routed inline links mark the current page with aria-current="page", and with currentMatch="section", pages below it with "true". Pass aria-current to override, including false. Button-styled links are only marked when you pass it.',
    "The current page is shown by weight as well as color.",
    "Inline links are underlined, so they're told apart from text by more than color. Hover thickens the underline.",
    'underline="hover" drops the underline at rest. Use it only where the position marks the links (a nav, a site name), since color alone can\'t (WCAG 1.4.1). A current link keeps its underline.',
    "The visited color is opt-in and color-only, so nothing depends on it.",
    "New-tab links end their name with “, opens in new tab”, also when named by aria-label or aria-labelledby, and the icon stays on the line of the last word.",
    "The focus ring uses component.link.focus-ring-color.",
  ],
};
