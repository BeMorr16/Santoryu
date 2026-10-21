import { CodeBlock } from "../../../components/CodeBlock/CodeBlock.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  type TableCellOwnProps,
  type TableHeaderCellOwnProps,
  type TableOwnProps,
} from "../../../components/Table/Table.tsx";
import { Typography } from "../../../components/Typography/Typography.tsx";
import { Announced } from "../Announced.tsx";
import { Example } from "../Example.tsx";
import type { KeyboardRow } from "../KeyboardTable.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const tableDocs = {
  caption: {
    type: "ReactNode",
    description:
      "Required. Names the table, and its focusable group while it scrolls. Shown above the panel unless hideCaption. No interactive content.",
  },
  hideCaption: {
    type: "boolean",
    default: "false",
    description:
      "Hides the caption visually; it still names the table for assistive technology. Use it only when visible text right before the table already says the same thing.",
  },
  children: {
    type: "ReactNode",
    description:
      "Required. TableHead, TableBody and TableFoot (or native thead, tbody and tfoot), after any colgroup elements.",
  },
} satisfies PropDocs<TableOwnProps>;

const alignDoc = {
  type: '"start" | "center" | "end"',
  default: '"start"',
  description: 'Text alignment in the cell. Use "end" for numeric columns, so digits line up.',
};

const headerCellDocs = {
  scope: {
    type: '"col" | "row" | "colgroup" | "rowgroup"',
    description:
      'Which cells it heads. Unset: "col" in TableHead, "row" in TableBody or TableFoot, and none elsewhere. Set it for a column header in the body, or to "colgroup" for a header over a column group, which needs a matching <colgroup span> before the head.',
  },
  align: alignDoc,
  children: { type: "ReactNode", description: "Required. The header text." },
} satisfies PropDocs<TableHeaderCellOwnProps>;

const cellDocs = {
  align: alignDoc,
  children: { type: "ReactNode", description: "Required. The cell's content." },
} satisfies PropDocs<TableCellOwnProps>;

export const tableKeyboard: readonly KeyboardRow[] = [
  {
    keys: "Tab / Shift+Tab",
    action: "Moves to the table while it's too wide to fit, then to any controls in its cells.",
  },
  { keys: "← / →", action: "Scrolls the focused table sideways." },
];

/** The Basic and customized examples: which engines make scrolling boxes Tab stops (checked 2026-10-20). */
export const scrollers = {
  caption: "Keyboard-focusable scrollers",
  columns: ["Engine", "Browsers", "Scrollers focusable by default"],
  rows: [
    ["Blink", "Chrome, Edge, Opera", "Yes, from Chrome 130, when nothing inside is focusable"],
    ["Gecko", "Firefox", "Yes"],
    ["WebKit", "Safari", "No"],
  ],
} as const;

/** The Wide example: what each key does in each interactive component, too wide for the panel. */
export const keySupport = {
  caption: "Library keyboard support",
  keys: ["Tab", "Shift+Tab", "Enter", "Space", "Arrow keys", "Home / End", "Escape", "A to Z"],
  rows: [
    ["Button", "Focuses it", "Focuses it", "Activates it", "Activates it", "—", "—", "—", "—"],
    ["Link", "Focuses it", "Focuses it", "Follows it", "Scrolls the page", "—", "—", "—", "—"],
    [
      "Menu",
      "Closes, moves on",
      "Closes, moves back",
      "Opens; chooses an item",
      "Opens; chooses or toggles",
      "Opens; next or previous item",
      "First or last item",
      "Closes",
      "Next matching item",
    ],
    [
      "Accordion",
      "Next heading or panel",
      "Previous heading or panel",
      "Opens or closes",
      "Opens or closes",
      "Scroll the page",
      "—",
      "—",
      "—",
    ],
    ["Tooltip", "Shows it", "Shows it", "—", "—", "—", "—", "Hides it", "—"],
    [
      "CodeBlock",
      "Copy button, then the code",
      "The code, then the copy button",
      "Copies",
      "Copies",
      "Scroll the focused code",
      "—",
      "—",
      "—",
    ],
    [
      "Table",
      "The table, while it's too wide",
      "The table, while it's too wide",
      "—",
      "—",
      "Scroll the focused table",
      "—",
      "—",
      "—",
    ],
  ],
} as const;

/** The Spanning cells example's sizes, in kB: an example, not this site's build. */
export const buildSizes = {
  caption: "Example build sizes",
  rows: [
    ["index.html", "4.2", "1.6"],
    ["entry.client.js", "182.4", "57.9"],
    ["root.css", "21.3", "4.8"],
  ],
  total: ["207.9", "64.3"],
} as const;

/** The customized example's CSS, shown beside the table it restyles and applied by `.customTable`. */
export const customTableCss = `.customTable {
  --component-table-header-background: var(--color-accent-background);
  --component-table-border: var(--color-accent-border);
}`;

function Scrollers({ className }: { className?: string | undefined }) {
  return (
    <Table caption={scrollers.caption} className={className}>
      <TableHead>
        <TableRow>
          {scrollers.columns.map((column) => (
            <TableHeaderCell key={column}>{column}</TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {scrollers.rows.map(([engine, browsers, focusable]) => (
          <TableRow key={engine}>
            <TableHeaderCell>{engine}</TableHeaderCell>
            <TableCell>{browsers}</TableCell>
            <TableCell>{focusable}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Examples() {
  return (
    <>
      <Example title="Basic" layout="column">
        <Scrollers />
      </Example>
      <Example title="Wide" layout="column">
        <Table caption={keySupport.caption} className={styles.wideTable}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Component</TableHeaderCell>
              {keySupport.keys.map((key) => (
                <TableHeaderCell key={key}>
                  <kbd>{key}</kbd>
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {keySupport.rows.map(([component, ...actions]) => (
              <TableRow key={component}>
                <TableHeaderCell>{component}</TableHeaderCell>
                {actions.map((action, index) => (
                  // Columns have no identity beyond their key, which is fixed per position.
                  <TableCell key={keySupport.keys[index]}>{action}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          Tables too wide for the panel scroll inside their box. While one scrolls, it&apos;s a Tab
          stop:
        </p>
        <Announced name={keySupport.caption} role="group" />
      </Example>
      <Example title="Spanning cells and a footer" layout="column">
        <Table caption={buildSizes.caption}>
          {/* The column groups "Size (kB)" heads with scope="colgroup": File, then Raw and Gzip. */}
          <colgroup />
          <colgroup span={2} />
          <TableHead>
            <TableRow>
              <TableHeaderCell rowSpan={2}>File</TableHeaderCell>
              <TableHeaderCell scope="colgroup" colSpan={2} align="center">
                Size (kB)
              </TableHeaderCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell align="end">Raw</TableHeaderCell>
              <TableHeaderCell align="end">Gzip</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buildSizes.rows.map(([file, raw, gzip]) => (
              <TableRow key={file}>
                <TableHeaderCell>{file}</TableHeaderCell>
                <TableCell align="end">{raw}</TableCell>
                <TableCell align="end">{gzip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableCell align="end">{buildSizes.total[0]}</TableCell>
              <TableCell align="end">{buildSizes.total[1]}</TableCell>
            </TableRow>
          </TableFoot>
        </Table>
      </Example>
      <Example title="Hidden caption" layout="column">
        <Typography as="h4">Theme keys</Typography>
        <Table caption="Theme keys" hideCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Stored value</TableHeaderCell>
              <TableHeaderCell>The page shows</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableHeaderCell>
                <code>light</code>
              </TableHeaderCell>
              <TableCell>The Light theme, whatever the system uses</TableCell>
            </TableRow>
            <TableRow>
              <TableHeaderCell>
                <code>dark</code>
              </TableHeaderCell>
              <TableCell>The Dark theme, whatever the system uses</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Announced name="Theme keys" role="table" />
      </Example>
      <Example title="Customized with component tokens" layout="column">
        <Scrollers className={styles.customTable} />
        <CodeBlock label="CSS" language="css">
          {customTableCss}
        </CodeBlock>
      </Example>
    </>
  );
}

export const tableShowcase: Showcase = {
  id: "table",
  name: "Table",
  exports: [
    "Table",
    "TableHead",
    "TableBody",
    "TableFoot",
    "TableRow",
    "TableHeaderCell",
    "TableCell",
  ],
  purpose: "A captioned data table that scrolls sideways inside itself when it's too wide.",
  Examples,
  props: [
    { part: "Table", docs: tableDocs },
    { part: "TableHeaderCell", docs: headerCellDocs },
    { part: "TableCell", docs: cellDocs },
  ],
  propsNote:
    "TableHead, TableBody, TableFoot and TableRow take only children and their element's native props. className and native props reach each part's element, and Table's reach the root div. caption holds no links or buttons. Native thead, tr, th and td inside a Table get the look, but not the automatic scope.",
  tokens: "table",
  keyboard: tableKeyboard,
  a11y: [
    "The caption names the table, and its focusable group while it scrolls. hideCaption hides it visually but keeps it for assistive technology.",
    'A header cell\'s scope comes from where it sits: "col" in TableHead, "row" in TableBody and TableFoot. An explicit scope always wins.',
    "While it's too wide to fit, the table is a focusable group named by its caption, so a keyboard can scroll it. Safari doesn't make scrolling boxes focusable on its own, and Chrome only does when nothing inside is focusable. Once it fits, it's no longer a Tab stop. Before the page's script runs, every table is one.",
    "It's a group, not a region, so a page of tables doesn't fill the landmarks list.",
    "The stripes, border and lines are decorative: the table's semantics carry its rows and columns. In forced colors the stripes go, and each body row gets a line instead.",
    "Use a table for tabular data, never for layout.",
  ],
};
