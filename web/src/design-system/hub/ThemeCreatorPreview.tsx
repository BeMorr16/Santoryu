import { hubData } from "../../generated/hub-data.ts";
import type { BuiltInTheme, CustomProperty } from "../../theme/apply-theme.ts";
import { Preview } from "./Preview.tsx";
import styles from "./Hub.module.css";
import { ThemeSample } from "./ThemeSample.tsx";

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
        <ThemeSample key={name} scheme={scheme} vars={vars} label={name} />
      ))}
    </Preview>
  );
}
