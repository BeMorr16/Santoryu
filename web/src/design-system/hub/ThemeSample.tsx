import { Button } from "../../components/Button/Button.tsx";
import { cx } from "../../components/shared/cx.ts";
import { Typography } from "../../components/Typography/Typography.tsx";
import { themeStyle, type BuiltInTheme, type CustomProperty } from "../../theme/apply-theme.ts";
import styles from "./Hub.module.css";

/**
 * One theme's sample, scoped to its own element: an "Aa" in the heading font and a primary
 * button, with an optional name and accent dots (ds-hub R3.3; theme-creator-controls R2.11). Its
 * container makes it decorative and inert.
 */
export function ThemeSample({
  scheme,
  vars,
  label,
  accents = false,
}: {
  scheme: BuiltInTheme;
  vars?: Readonly<Record<CustomProperty, string>> | undefined;
  label?: string | undefined;
  /** Shows the theme's two accent colors as dots. */
  accents?: boolean | undefined;
}) {
  return (
    <div data-theme={scheme} style={vars && themeStyle(vars)} className={styles.panel}>
      {label !== undefined && (
        <Typography as="span" variant="small">
          {label}
        </Typography>
      )}
      <span className={styles.typeH3}>Aa</span>
      <Button variant="primary" size="sm">
        Save
      </Button>
      {accents && (
        <span className={styles.accents}>
          <span className={cx(styles.dot, styles.swatchAccent)} />
          <span className={cx(styles.dot, styles.swatchAccent2)} />
        </span>
      )}
    </div>
  );
}
