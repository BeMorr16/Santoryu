import { useId, useState } from "react";
import { Button } from "../../components/Button/Button.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import {
  componentGroups,
  componentPages,
  componentPath,
  componentsPath,
  type ComponentGroup,
} from "./pages.ts";
import styles from "./SideMenu.module.css";

/** One group's visible name and the list of its pages, labelled by that name (R2.2). */
export function SideMenuGroup({ group }: { group: ComponentGroup }) {
  const labelId = useId();
  return (
    <div>
      <Typography variant="label" id={labelId}>
        {group}
      </Typography>
      <Stack as="ul" gap="xs" aria-labelledby={labelId} className={styles.list}>
        {componentPages
          .filter((page) => page.group === group)
          .map((page) => (
            <li key={page.id}>
              <Link href={componentPath(page.id)} underline="hover">
                {page.name}
              </Link>
            </li>
          ))}
      </Stack>
    </div>
  );
}

/**
 * The docs pages' side menu (R2): a column from 48em, and a collapsed "Components" disclosure
 * above the content below it. The shell remounts it on every navigation, so it starts collapsed.
 */
export function ComponentsSideMenu() {
  const [open, setOpen] = useState(false);
  const listsId = useId();
  return (
    <nav aria-label="Components" className={styles.sideMenu}>
      <Button
        className={styles.toggle}
        size="sm"
        iconEnd="chevron-down"
        aria-expanded={open}
        aria-controls={listsId}
        onClick={() => {
          setOpen(!open);
        }}
      >
        Components
      </Button>
      <Stack id={listsId} gap="md" className={styles.lists} data-open={open || undefined}>
        <Link href={componentsPath} underline="hover">
          Overview
        </Link>
        {componentGroups.map((group) => (
          <SideMenuGroup key={group} group={group} />
        ))}
      </Stack>
    </nav>
  );
}
