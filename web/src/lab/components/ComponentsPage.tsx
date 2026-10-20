import { useId } from "react";
import { Accordion, AccordionItem } from "../../components/Accordion/Accordion.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { ComponentTokenTable } from "../ComponentTokenTable.tsx";
import { KeyboardTable } from "./KeyboardTable.tsx";
import { PreviewPanel } from "./PreviewPanel.tsx";
import { PropsTable } from "./PropsTable.tsx";
import { showcases } from "./registry.ts";
import type { Showcase } from "./Showcase.ts";
import styles from "./Showcase.module.css";

function Section({ showcase }: { showcase: Showcase }) {
  const headingId = useId();
  const { Examples } = showcase;
  return (
    <section id={showcase.id} className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{showcase.name}</h2>
      <p>{showcase.purpose}</p>
      <h3>Examples</h3>
      <PreviewPanel label={showcase.name}>
        <Examples />
      </PreviewPanel>
      <Accordion headingLevel={3} headingVariant="h3">
        <AccordionItem heading="Props">
          <Stack>
            <p>Any native prop not listed here goes to the root element unchanged.</p>
            {showcase.propsNote && <p>{showcase.propsNote}</p>}
            {showcase.props.map(({ part, docs }) => (
              <PropsTable key={part} caption={`${part} props`} props={docs} />
            ))}
          </Stack>
        </AccordionItem>
        <AccordionItem heading="Component tokens">
          {showcase.tokens === null ? (
            <p>{showcase.tokensNote}</p>
          ) : (
            <ComponentTokenTable
              component={showcase.tokens}
              caption={`${showcase.name} component tokens`}
            />
          )}
        </AccordionItem>
        <AccordionItem heading="Accessibility">
          <Stack>
            <ul className={styles.notes}>
              {showcase.a11y.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            {showcase.keyboard && (
              <KeyboardTable caption={`${showcase.name} keyboard`} rows={showcase.keyboard} />
            )}
          </Stack>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

/** The component showcase (R15): an in-page list of sections, then one section per component. */
export function ComponentsPage() {
  return (
    <>
      <div>
        <Typography variant="label" id="on-this-page">
          On this page
        </Typography>
        <ul className={styles.toc} aria-labelledby="on-this-page">
          {showcases.map((showcase) => (
            <li key={showcase.id}>
              <Link href={`#${showcase.id}`}>{showcase.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      {showcases.map((showcase) => (
        <Section key={showcase.id} showcase={showcase} />
      ))}
    </>
  );
}
