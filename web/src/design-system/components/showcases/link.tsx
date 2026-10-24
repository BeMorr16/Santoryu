import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import { Link, type LinkOwnProps } from "../../../components/Link/Link.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Announced } from "../Announced.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";
import { buttonLookDocs } from "../shared-docs.ts";
import { LinkExample } from "../examples/LinkExample.tsx";
import linkExampleSource from "../examples/LinkExample.tsx?raw";

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
    type: '"always" | "hover" | "none"',
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
      'With appearance="button" only. An icon-only link shows its name (without the new-tab text) as a tooltip; false turns it off. None for a link named by aria-labelledby, whose name is already on screen.',
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

/** Automatic and overridden aria-current, as rendered on this page (refinement R4.8). */
const currentExamples = [
  {
    link: <Link href="/design-system/components/link">This page</Link>,
    announced: { name: "This page", role: "link, current page" },
  },
  {
    link: (
      <Link href="/design-system/components/link" aria-current={false}>
        This page, unmarked
      </Link>
    ),
    announced: { name: "This page, unmarked", role: "link" },
  },
];

function InlineInRunningTextExample() {
  return (
    <p>
      Read about the <Link href="/design-system/tokens">design tokens</Link>, or email{" "}
      <Link href="mailto:hello@example.com">hello@example.com</Link>.
    </p>
  );
}

function NewTabExample() {
  return (
    <>
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
    </>
  );
}

function VisitedOptInExample() {
  return (
    <>
      <p>
        <Link href="/design-system" showVisited>
          Design System
        </Link>{" "}
        and{" "}
        <Link href="/design-system/tokens" showVisited>
          Design tokens
        </Link>
      </p>
      <p>Visited links turn violet.</p>
    </>
  );
}

function CurrentPageExample() {
  return (
    <>
      {currentExamples.map(({ link, announced }) => (
        <div key={announced.name} className={styles.row}>
          {link}
          <Announced {...announced} />
        </div>
      ))}
    </>
  );
}

function UnderlineOnHoverExample() {
  return (
    <Stack as="ul" direction="horizontal" aria-label="Design System pages">
      <li>
        <Link href="/design-system" underline="hover">
          Design System
        </Link>
      </li>
      <li>
        <Link href="/design-system/tokens" underline="hover">
          Tokens
        </Link>
      </li>
      <li>
        <Link href="/design-system/components/link" underline="hover">
          Link
        </Link>
      </li>
    </Stack>
  );
}

function NoUnderlineExample() {
  return (
    <Stack as="ul" direction="horizontal" aria-label="Design System pages, no underline">
      <li>
        <Link href="/design-system" underline="none">
          Design System
        </Link>
      </li>
      <li>
        <Link href="/design-system/tokens" underline="none">
          Tokens
        </Link>
      </li>
      <li>
        <Link href="/design-system/components/link" underline="none">
          Link
        </Link>
      </li>
    </Stack>
  );
}

function AsAButtonExample() {
  return (
    <>
      <Link href="/design-system" appearance="button" variant="primary" iconEnd="arrow-right">
        Explore the design system
      </Link>
      <Link href="https://www.linkedin.com/" appearance="button" iconStart="linkedin" newTab>
        LinkedIn
      </Link>
      <Link href="/design-system/tokens" appearance="button" variant="ghost" size="sm">
        Tokens
      </Link>
      <Link
        href="mailto:hello@example.com"
        appearance="button"
        iconStart="mail"
        aria-label="Email me"
      />
    </>
  );
}

function CustomizedWithAComponentTokenExample() {
  return (
    <>
      <p className={styles.quietLinks}>
        Quiet links, like this <Link href="/design-system/tokens">token reference</Link>, keep the
        underline but take the text color.
      </p>
      <CodeBlock label="CSS" language="css">
        {quietLinksCss}
      </CodeBlock>
    </>
  );
}

export const linkShowcase: Showcase = {
  id: "link",
  exports: ["Link"],
  purpose: "Navigation to another page or site, optionally styled as a button.",
  main: { Example: LinkExample, source: linkExampleSource, file: "LinkExample.tsx" },
  examples: [
    { title: "Inline, in running text", Content: InlineInRunningTextExample },
    { title: "New tab", layout: "column", Content: NewTabExample },
    { title: "Visited (opt-in)", layout: "column", Content: VisitedOptInExample },
    { title: "Current page", layout: "column", Content: CurrentPageExample },
    { title: "Underline on hover", Content: UnderlineOnHoverExample },
    { title: "No underline", Content: NoUnderlineExample },
    { title: "As a button", Content: AsAButtonExample },
    {
      title: "Customized with a component token",
      layout: "column",
      Content: CustomizedWithAComponentTokenExample,
    },
  ],
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
    'underline="none" never underlines, even when current or hovered. Use it only where the position marks the links and something besides color marks the current one, such as the site bar\'s brackets (WCAG 1.4.1). A current link is still bold.',
    "The visited color is opt-in and color-only, so nothing depends on it.",
    "New-tab links end their name with “, opens in new tab”, also when named by aria-label or aria-labelledby, and the icon stays on the line of the last word.",
    "The focus ring uses component.link.focus-ring-color.",
  ],
};
