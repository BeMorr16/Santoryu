import { Typography } from "../../components/Typography/Typography.tsx";
import { BackToDesignSystem } from "../BackToDesignSystem.tsx";
import { ThemeCreator } from "./ThemeCreator.tsx";
import styles from "./ThemeCreatorPage.module.css";
import { useHydrated } from "./useHydrated.ts";

/**
 * /design-system/theme-creator (theme-creator R1): the heading and lead, then the editor once
 * JavaScript runs. Prerendered, it shows a note instead of controls that would do nothing (R1.4).
 */
export function ThemeCreatorPage() {
  const hydrated = useHydrated();
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <BackToDesignSystem />
        <h1>Theme Creator</h1>
        <Typography variant="lead" measure>
          Build your own theme from this site’s design tokens. Change a few key colors, the type,
          shape and spacing, or any single token, and see it on real components as you go. Save up
          to three themes to use across the site, or export one as a design tokens file.
        </Typography>
      </div>
      {hydrated ? (
        <ThemeCreator />
      ) : (
        <p className={styles.noScript}>
          The theme creator needs JavaScript. Without it, the site follows your system’s light or
          dark setting.
        </p>
      )}
    </div>
  );
}
