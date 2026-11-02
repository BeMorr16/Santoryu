import { useId, type Ref } from "react";
import { Grid } from "../../components/Grid/Grid.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { MAX_CUSTOM_THEMES, type StoredTheme } from "../../theme/custom-themes.ts";
import { useStorageAvailable } from "../../theme/useCustomThemes.ts";
import type { CardAction } from "./model/library.ts";
import { NewThemeMenu } from "./NewThemeMenu.tsx";
import { ThemeCard } from "./ThemeCard.tsx";
import styles from "./ThemeCreator.module.css";
import type { ThemeActions } from "./useThemeActions.ts";

/**
 * "Your themes" (theme-creator-controls R2, R3; design §4.1): the count, the New theme menu, a
 * card per saved theme, where they're kept, and an import's problems.
 */
export function ThemeLibrary({
  actions,
  editingId,
  headingRef,
}: {
  actions: ThemeActions;
  /** The id the draft edits in place, if any. */
  editingId: string | null;
  /** Focusable from script, for when a dialog's opener is gone. */
  headingRef?: Ref<HTMLHeadingElement> | undefined;
}) {
  const headingId = useId();
  const storage = useStorageAvailable();
  const { saved, activeId, importErrors } = actions;
  const cardActions: Record<CardAction, (theme: StoredTheme) => void> = {
    useOnSite: actions.applyOnSite,
    duplicate: actions.duplicate,
    rename: actions.askRename,
    delete: actions.askDelete,
  };
  return (
    <section aria-labelledby={headingId} className={styles.library}>
      <div className={styles.libraryHeader}>
        <h2 id={headingId} ref={headingRef} tabIndex={-1}>
          Your themes
        </h2>
        <Typography as="p" variant="small" tone="muted" className={styles.count}>
          {saved.length} of {MAX_CUSTOM_THEMES} saved
        </Typography>
        <div className={styles.newTheme}>
          <NewThemeMenu
            onStart={actions.start}
            onImportFile={(file) => void actions.importFile(file)}
          />
        </div>
      </div>
      {saved.length === 0 ? (
        <p className={styles.empty}>
          No saved themes yet. Make changes below and save to keep up to three.
        </p>
      ) : (
        // Empty columns are kept, so one or two cards never stretch across the row.
        <Grid as="ul" min="md" maxColumns={3} stretch={false}>
          {saved.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              inUse={theme.id === activeId}
              editing={theme.id === editingId}
              onEdit={() => {
                actions.edit(theme);
              }}
              onAction={(action) => {
                cardActions[action](theme);
              }}
            />
          ))}
        </Grid>
      )}
      <Typography variant="small" tone="muted">
        Themes are saved in this browser. Export one to keep a copy.
      </Typography>
      {!storage && (
        <Typography variant="small" tone="warning">
          This browser isn’t allowing storage: saved themes last only while this page is open, and
          edits won’t survive a reload.
        </Typography>
      )}
      {importErrors && (
        <div key={importErrors.attempt} role="alert" className={styles.importErrors}>
          <p>The file couldn’t be imported:</p>
          <ul>
            {importErrors.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {importErrors.more > 0 && <p>and {importErrors.more} more.</p>}
        </div>
      )}
    </section>
  );
}
