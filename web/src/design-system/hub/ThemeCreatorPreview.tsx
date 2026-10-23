import { Button } from "../../components/Button/Button.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { hubData } from "../../generated/hub-data.ts";
import { themeStyle, type BuiltInTheme, type CustomProperty } from "../../theme/apply-theme.ts";
import { Preview } from "./Preview.tsx";
import styles from "./Hub.module.css";

interface Panel {
  name: string;
  scheme: BuiltInTheme;
  vars?: Readonly<Record<CustomProperty, string>>;
}

const panels: readonly Panel[] = [
  { name: "Light", scheme: "light" },
  { name: "Dark", scheme: "dark" },
  {
    name: hubData.highContrast.name,
    scheme: hubData.highContrast.scheme,
    vars: hubData.highContrast.vars,
  },
];

/** One sample in Light, Dark and High contrast, each scoped to its panel (ds-hub R3.3, design §1.1). */
export function ThemeCreatorPreview() {
  return (
    <Preview className={styles.panels}>
      {panels.map(({ name, scheme, vars }) => (
        <div
          key={name}
          data-theme={scheme}
          style={vars && themeStyle(vars)}
          className={styles.panel}
        >
          <Typography as="span" variant="small">
            {name}
          </Typography>
          <span className={styles.typeH3}>Aa</span>
          <Button variant="primary" size="sm">
            Save
          </Button>
        </div>
      ))}
    </Preview>
  );
}
