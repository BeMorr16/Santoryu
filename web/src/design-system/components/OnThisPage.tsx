import { useId } from "react";
import { Link } from "../../components/Link/Link.tsx";
import { cx } from "../../components/shared/cx.ts";
import { Stack } from "../../components/Stack/Stack.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import styles from "./OnThisPage.module.css";
import type { TocItem } from "./toc.ts";

function TocList({ items, labelledBy }: { items: readonly TocItem[]; labelledBy?: string }) {
  return (
    <Stack as="ul" gap="xs" aria-labelledby={labelledBy} className={styles.list}>
      {items.map(({ id, label, children }) => (
        <li key={id}>
          <Link href={`#${id}`} underline="hover">
            {label}
          </Link>
          {children && children.length > 0 && <TocList items={children} />}
        </li>
      ))}
    </Stack>
  );
}

/** In-page links to a docs page's headings: a labelled list, not a landmark (R4.2). */
export function OnThisPage({
  items,
  className,
}: {
  items: readonly TocItem[];
  className?: string | undefined;
}) {
  const labelId = useId();
  return (
    <div className={cx(styles.onThisPage, className)}>
      <Typography variant="label" id={labelId}>
        On this page
      </Typography>
      <TocList items={items} labelledBy={labelId} />
    </div>
  );
}
