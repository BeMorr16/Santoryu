import { Badge } from "../../components/Badge/Badge.tsx";
import { Button } from "../../components/Button/Button.tsx";
import { Card } from "../../components/Card/Card.tsx";
import { cx } from "../../components/shared/cx.ts";
import type { IconName } from "../../components/Icon/registry.ts";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import type { StoredTheme } from "../../theme/custom-themes.ts";
import { Preview } from "../hub/Preview.tsx";
import { ThemeSample } from "../hub/ThemeSample.tsx";
import { cardMenuItems, type CardAction } from "./model/library.ts";
import styles from "./ThemeCreator.module.css";

const menuItems: Record<CardAction, { label: string; icon?: IconName }> = {
  useOnSite: { label: "Use on site" },
  duplicate: { label: "Duplicate" },
  rename: { label: "Rename" },
  delete: { label: "Delete", icon: "trash" },
};

/**
 * One saved theme in the library (theme-creator-controls R2.2, R2.5, R2.6, R2.11; design §4.2): a
 * sample drawn in the theme, its name, scheme and badges, Edit, and a menu of its other actions.
 */
export function ThemeCard({
  theme,
  inUse,
  editing,
  onEdit,
  onAction,
}: {
  theme: StoredTheme;
  /** Selected site-wide. */
  inUse: boolean;
  /** The theme the draft edits in place. */
  editing: boolean;
  onEdit: () => void;
  onAction: (action: CardAction) => void;
}) {
  return (
    <Card
      as="li"
      headingLevel={3}
      heading={theme.name}
      variant={editing ? "outlined" : "raised"}
      className={cx(styles.card, editing && styles.editingCard)}
      media={
        <Preview className={styles.cardSample}>
          <ThemeSample scheme={theme.scheme} vars={theme.vars} accents />
        </Preview>
      }
      footer={
        <div className={styles.cardActions}>
          <Button
            size="sm"
            disabled={editing}
            disabledReason="You’re editing this theme"
            onClick={onEdit}
          >
            Edit <VisuallyHidden>{theme.name}</VisuallyHidden>
          </Button>
          <Menu>
            <MenuTrigger size="sm" iconEnd="chevron-down">
              More <VisuallyHidden>actions for {theme.name}</VisuallyHidden>
            </MenuTrigger>
            <MenuPopup align="end">
              {cardMenuItems({ inUse }).map((item) =>
                item === "separator" ? (
                  <MenuSeparator key={item} />
                ) : (
                  <MenuItem
                    key={item}
                    icon={menuItems[item].icon}
                    onSelect={() => {
                      onAction(item);
                    }}
                  >
                    {menuItems[item].label}
                  </MenuItem>
                ),
              )}
            </MenuPopup>
          </Menu>
        </div>
      }
    >
      <div className={styles.cardMeta}>
        <Typography as="span" variant="small" tone="muted">
          {theme.scheme === "dark" ? "Dark" : "Light"}
        </Typography>
        {inUse && <Badge variant="accent">In use</Badge>}
        {editing && <Badge>Editing</Badge>}
      </div>
    </Card>
  );
}
