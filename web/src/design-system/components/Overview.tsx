import { CodeBlock } from "../../components/CodeBlock/CodeBlock.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { repoUrl } from "../../site.config.ts";
import { DocSection } from "./ComponentPage.tsx";
import styles from "./ComponentPage.module.css";
import { OnThisPage } from "./OnThisPage.tsx";
import { componentPages, componentsPath } from "./pages.ts";
import { PrevNext } from "./PrevNext.tsx";
import showcaseStyles from "./Showcase.module.css";

const [principles, usage, testing, source] = [
  { id: "principles", label: "Principles" },
  { id: "usage", label: "Usage" },
  { id: "testing", label: "How it's tested" },
  { id: "source", label: "Source" },
];

/** Importing and rendering a component, through the alias every main example uses (R3.3). */
export const usageCode = `import { Button } from "@/components/Button";

export function SaveButton() {
  return <Button variant="primary">Save changes</Button>;
}`;

/** Restyling a component through its tokens, on a wrapper class (R3.3). */
export const stylingCode = `.brand {
  --component-button-primary-background: var(--color-accent-text);
  --component-button-primary-border: var(--color-accent-text);
}`;

/** The components overview (ds-components R3): what the library is, how to use it and how it's tested. */
export function Overview() {
  return (
    <div className={styles.docPage}>
      <div className={styles.intro}>
        <h1>Components</h1>
        <Typography variant="lead">
          A library of {componentPages.length} React components, built for this site on its design
          tokens. Each one has its own page, with a live example and its code, every variant, its
          props, its tokens and how it works with a keyboard and assistive technology.
        </Typography>
      </div>
      <OnThisPage className={styles.toc} items={[principles, usage, testing, source]} />
      <div className={styles.content}>
        <DocSection {...principles}>
          <ul className={showcaseStyles.notes}>
            <li>
              Every visual value comes from a design token: no raw colors, sizes or durations.
            </li>
            <li>
              Web Content Accessibility Guidelines (WCAG) 2.2 AA is the floor, for every component
              and every example.
            </li>
            <li>
              Few components, each configurable. Behavior and ARIA are automatic by default and can
              always be overridden.
            </li>
            <li>
              Native props go through to the root element, so a component works like its element.
            </li>
            <li>
              Restyling goes through each component&apos;s own tokens, never through its class
              names.
            </li>
          </ul>
        </DocSection>
        <DocSection {...usage}>
          <p>Import a component from its folder and render it like any React component.</p>
          <CodeBlock label="SaveButton.tsx" language="tsx">
            {usageCode}
          </CodeBlock>
          <p>
            To restyle one, override its <code>--component-*</code> tokens on a wrapper class. Each
            component page lists its tokens.
          </p>
          <CodeBlock label="CSS" language="css">
            {stylingCode}
          </CodeBlock>
        </DocSection>
        <DocSection {...testing}>
          <ul className={showcaseStyles.notes}>
            <li>
              Unit tests for every component, including its keyboard use and accessible names.
            </li>
            <li>axe accessibility checks, in unit tests and in the browser.</li>
            <li>Browser tests with Playwright in Chromium and WebKit.</li>
            <li>Props tables kept in step with the components&apos; types by the type checker.</li>
            <li>A registry test that fails if any library export has no docs page.</li>
          </ul>
        </DocSection>
        <DocSection {...source}>
          <p>
            Read the{" "}
            <Link href={`${repoUrl}/tree/main/web/src/components`}>
              library&apos;s source on GitHub
            </Link>
            .
          </p>
        </DocSection>
        <PrevNext current={componentsPath} />
      </div>
    </div>
  );
}
