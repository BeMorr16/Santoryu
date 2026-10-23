import { memo, useId, useState } from "react";
import { Accordion, AccordionItem } from "../../components/Accordion/Accordion.tsx";
import { Badge } from "../../components/Badge/Badge.tsx";
import { Button } from "../../components/Button/Button.tsx";
import { Card } from "../../components/Card/Card.tsx";
import { CodeBlock } from "../../components/CodeBlock/CodeBlock.tsx";
import { Icon } from "../../components/Icon/Icon.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/Table/Table.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { themeStyle } from "../../theme/apply-theme.ts";
import type { ResolvedTheme } from "./model/types.ts";
import { themeVars } from "./model/vars.ts";
import styles from "./ThemeCreator.module.css";

const sampleCode = `:root {
  --color-action-background: #b37500;
}`;

/**
 * The preview's content: real library components, each reading its own tokens (R7.2). It has no
 * props and is memoized: only the region's theme changes while editing, and the browser restyles
 * it (design §8.5).
 */
const PreviewSample = memo(function PreviewSample() {
  const [pressed, setPressed] = useState(false);
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Typography as="h3" variant="h2">
          Northern lights
        </Typography>
        <Typography variant="lead">A small page in your theme.</Typography>
        <p>
          Body text with a <Link href="#theme-preview">link back to the top</Link>, in the body font
          at the body size.
        </p>
      </Stack>
      <Stack direction="horizontal" gap="sm" wrap>
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button
          variant="primary"
          aria-pressed={pressed}
          onClick={() => {
            setPressed(!pressed);
          }}
        >
          Pin
        </Button>
      </Stack>
      <Stack as="ul" direction="horizontal" gap="xs" wrap aria-label="Badges">
        <Badge as="li">Neutral</Badge>
        <Badge as="li" variant="accent">
          Accent
        </Badge>
        <Badge as="li" variant="accent-2">
          Second accent
        </Badge>
      </Stack>
      <Card heading="Sign up" headingLevel={4}>
        <Stack gap="md">
          <TextField label="Name" hint="As you'd like to be addressed." />
          <TextField
            label="Email"
            type="email"
            defaultValue="ben@"
            error="Enter an email address."
          />
        </Stack>
      </Card>
      <Table caption="Release notes">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Version</TableHeaderCell>
            <TableHeaderCell>Change</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell>1.1</TableHeaderCell>
            <TableCell>Custom themes</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell>1.0</TableHeaderCell>
            <TableCell>Light and dark</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Accordion headingLevel={4}>
        <AccordionItem heading="What changes with my theme?">
          <p>Every component on the site reads the same tokens, so all of them follow it.</p>
        </AccordionItem>
        <AccordionItem heading="Where is it saved?">
          <p>In this browser only. Export it to keep a copy.</p>
        </AccordionItem>
      </Accordion>
      <CodeBlock label="theme.css" language="css">
        {sampleCode}
      </CodeBlock>
      <Stack as="ul" gap="xs" className={styles.statuses}>
        <Typography as="li" tone="error">
          <Icon name="warning" /> Error: the name is already taken.
        </Typography>
        <Typography as="li" tone="success">
          <Icon name="check" /> Success: theme saved.
        </Typography>
        <Typography as="li" tone="warning">
          <Icon name="warning" /> Warning: 2 contrast issues.
        </Typography>
      </Stack>
    </Stack>
  );
});

/**
 * The draft, shown only inside this region (R7.1): its scheme and its differences from the
 * built-in theme, as a scoped theme on real components.
 */
export function ThemePreview({ theme }: { theme: ResolvedTheme }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.preview}>
      <h2 id={headingId} className={styles.asideHeading}>
        Preview
      </h2>
      <div
        className={styles.previewPage}
        data-theme={theme.scheme}
        style={themeStyle(themeVars(theme, "diff"))}
      >
        <div id="theme-preview" className={styles.previewSample}>
          <PreviewSample />
        </div>
      </div>
    </section>
  );
}
