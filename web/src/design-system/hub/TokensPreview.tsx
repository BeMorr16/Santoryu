import { cx } from "../../components/shared/cx.ts";
import { Preview } from "./Preview.tsx";
import styles from "./Hub.module.css";

const swatches = [
  "swatchAction",
  "swatchAccent2",
  "swatchAccent",
  "swatchSuccess",
  "swatchWarning",
  "swatchError",
] as const;
const typeSizes = ["typeSmall", "typeBody", "typeH3"] as const;
const radii = ["radiusControl", "radiusSurface", "radiusPill"] as const;
const spaces = ["spaceSm", "spaceMd", "spaceLg"] as const;

/** Semantic color swatches, three type sizes, then radius and space steps, all from tokens (ds-hub R3.1). */
export function TokensPreview() {
  return (
    <Preview className={styles.tokens}>
      <div className={styles.row}>
        {swatches.map((swatch) => (
          <span key={swatch} className={cx(styles.swatch, styles[swatch])} />
        ))}
      </div>
      <div className={styles.row}>
        {typeSizes.map((size) => (
          <span key={size} className={cx(styles.type, styles[size])}>
            Aa
          </span>
        ))}
      </div>
      <div className={styles.row}>
        {radii.map((radius) => (
          <span key={radius} className={cx(styles.shape, styles[radius])} />
        ))}
        {spaces.map((space) => (
          <span key={space} className={cx(styles.bar, styles[space])} />
        ))}
      </div>
    </Preview>
  );
}
