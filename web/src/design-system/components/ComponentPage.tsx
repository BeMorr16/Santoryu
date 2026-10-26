import { CodeBlock } from "../../components/CodeBlock/CodeBlock.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { componentTokensOf } from "../../tokens/metadata.ts";
import { ComponentTokenTable } from "../ComponentTokenTable.tsx";
import { DocSection } from "../DocSection.tsx";
import { pageMeta } from "../../shell/page-meta.ts";
import styles from "./ComponentPage.module.css";
import { ExampleGroup } from "./ExampleGroup.tsx";
import { KeyboardTable } from "./KeyboardTable.tsx";
import { OnThisPage } from "./OnThisPage.tsx";
import { componentPage, componentPath, tokensPath } from "./pages.ts";
import { PrevNext } from "./PrevNext.tsx";
import { PreviewPanel } from "./PreviewPanel.tsx";
import { PropsTable } from "./PropsTable.tsx";
import type { Showcase } from "./Showcase.ts";
import showcaseStyles from "./Showcase.module.css";
import { sourceUrl } from "./source-url.ts";
import { sections, tocItems } from "./toc.ts";

/**
 * One component's docs page (ds-components R4.1): its name, purpose and source link, On this page,
 * the main example and its source, then Examples, Props, Component tokens and Accessibility, all
 * expanded, then previous/next.
 */
export function ComponentPage({ showcase }: { showcase: Showcase }) {
  const { name } = componentPage(showcase.id);
  const { main } = showcase;
  const [examples, props, tokens, accessibility] = sections;
  return (
    <div className={styles.docPage}>
      <div className={styles.intro}>
        <h1>{name}</h1>
        <Typography variant="lead">{showcase.purpose}</Typography>
        <p>
          <Link href={sourceUrl(name)}>View source on GitHub</Link>
        </p>
      </div>
      <OnThisPage className={styles.toc} items={tocItems(showcase)} />
      <div className={styles.content}>
        <Stack gap="sm">
          <PreviewPanel label={`${name} example`}>
            <main.Example />
          </PreviewPanel>
          <CodeBlock label={main.file} language="tsx">
            {main.source}
          </CodeBlock>
        </Stack>
        <DocSection {...examples}>
          <PreviewPanel label={`${name} examples`}>
            {showcase.examples.map((example) => (
              <ExampleGroup key={example.title} {...example} />
            ))}
          </PreviewPanel>
        </DocSection>
        <DocSection {...props}>
          {showcase.nativePropsToRoot !== false && (
            <p>Any native prop not listed here goes to the root element unchanged.</p>
          )}
          {showcase.propsNote && <p>{showcase.propsNote}</p>}
          {showcase.props.map(({ part, docs }) => (
            <PropsTable key={part} caption={`${part} props`} props={docs} />
          ))}
        </DocSection>
        <DocSection {...tokens}>
          {showcase.tokens === null ? (
            <p>{showcase.tokensNote}</p>
          ) : (
            <ComponentTokenTable
              tokens={componentTokensOf(showcase.tokens)}
              caption={`${name} component tokens`}
              linkBase={tokensPath}
            />
          )}
        </DocSection>
        <DocSection {...accessibility}>
          <ul className={showcaseStyles.notes}>
            {showcase.a11y.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {showcase.keyboard && (
            <KeyboardTable caption={`${name} keyboard`} rows={showcase.keyboard} />
          )}
        </DocSection>
        <PrevNext current={componentPath(showcase.id)} />
      </div>
    </div>
  );
}

/** A component page's title, "<Name> · Components · Design System · Ben Morrison", description and URL. */
function componentPageHead(showcase: Showcase) {
  const { name } = componentPage(showcase.id);
  return pageMeta(
    componentPath(showcase.id),
    `${name} · Components · Design System`,
    showcase.purpose,
  );
}

/** A component page's `meta`: its title and description (R1.5). */
export function componentPageMeta(showcase: Showcase) {
  return componentPageHead(showcase).meta();
}

/** A component page's `links`: its canonical URL (R1.1). */
export function componentPageLinks(showcase: Showcase) {
  return componentPageHead(showcase).links();
}
