import type { Ref } from "react";
import { Button } from "../../components/Button/Button.tsx";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../../components/Menu/Menu.tsx";
import { SectionLinks } from "./SectionLinks.tsx";
import styles from "./ThemeCreator.module.css";
import type { ThemeActions } from "./useThemeActions.ts";

/**
 * The draft's status and actions, its polite notice line, then the section links
 * (theme-creator-controls R4, R5; design §5.1). Save is the page's one primary button.
 */
export function DraftToolbar({
  actions,
  startedFrom,
  ref,
}: {
  actions: ThemeActions;
  /** What the draft started from, for "New theme from <start>". */
  startedFrom: string;
  ref?: Ref<HTMLDivElement> | undefined;
}) {
  const { editing, dirty, issues, notice } = actions;
  return (
    <div ref={ref} className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        {/* Not announced on every change (theme-creator R3.6). */}
        <p className={styles.status}>
          {editing ? `Editing ${editing.name}` : `New theme from ${startedFrom}`}
          {dirty && " · Unsaved changes"}
          {" · "}
          {issues === 0
            ? "All contrast pairings pass"
            : `${String(issues)} contrast ${issues === 1 ? "issue" : "issues"}`}
        </p>
        <div className={styles.toolbarActions}>
          <Button
            variant="ghost"
            iconStart="reset"
            disabled={!dirty}
            disabledReason="No changes to discard"
            onClick={actions.askDiscard}
          >
            Discard changes
          </Button>
          <Menu>
            <MenuTrigger iconEnd="chevron-down">Export</MenuTrigger>
            <MenuPopup align="end">
              <MenuItem icon="download" onSelect={actions.downloadFile}>
                Download tokens file
              </MenuItem>
              <MenuItem
                icon="copy"
                onSelect={() => {
                  void actions.copyCss();
                }}
              >
                Copy CSS
              </MenuItem>
            </MenuPopup>
          </Menu>
          {editing && <Button onClick={actions.askSaveAsNew}>Save as new</Button>}
          <Button variant="primary" onClick={actions.save}>
            Save
          </Button>
        </div>
      </div>
      {/* Shown and announced once, politely (R6.3). */}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <SectionLinks />
    </div>
  );
}
