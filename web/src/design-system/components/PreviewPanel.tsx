import { useState, type ReactNode } from "react";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import { themeAttributes, themeStyle } from "../../theme/apply-theme.ts";
import { customChoice, type ThemeChoice } from "../../theme/preference.ts";
import { useCustomThemes } from "../../theme/useCustomThemes.ts";
import styles from "./PreviewPanel.module.css";

const builtIns = { site: "Site", light: "Light", dark: "Dark" } as const;
const builtInOptions = ["site", "light", "dark"] as const;
type PreviewTheme = (typeof builtInOptions)[number] | ThemeChoice;

/**
 * Examples in a theme chosen for this panel only (R15.6, theme-creator R9.7). Light and Dark set
 * data-theme on the panel; a custom theme also sets its properties there; Site follows the page.
 * The choice is state only, never persisted. `label` names the panel ("Button examples") and ends
 * its theme trigger's name.
 */
export function PreviewPanel({ label, children }: { label: string; children: ReactNode }) {
  const [choice, setChoice] = useState<PreviewTheme>("site");
  const customThemes = useCustomThemes();
  const custom = customThemes.find(({ id }) => customChoice(id) === choice);
  // A custom theme deleted while chosen falls back to Site: derived, so nothing to sync.
  const builtIn = builtInOptions.find((option) => option === choice) ?? "site";
  return (
    <div
      className={styles.panel}
      {...(custom
        ? { ...themeAttributes(custom), style: themeStyle(custom.vars) }
        : { "data-theme": builtIn === "site" ? undefined : builtIn })}
      role="group"
      aria-label={label}
    >
      <div className={styles.toolbar}>
        <Menu>
          {/* The name starts with the visible text (WCAG 2.5.3), then says which panel. */}
          <MenuTrigger size="sm" iconEnd="chevron-down">
            Theme: {custom?.name ?? builtIns[builtIn]}{" "}
            <VisuallyHidden>({label} preview)</VisuallyHidden>
          </MenuTrigger>
          <MenuPopup>
            <MenuRadioGroup<PreviewTheme>
              label="Preview theme"
              value={custom ? choice : builtIn}
              onValueChange={setChoice}
            >
              {builtInOptions.map((option) => (
                <MenuRadioItem key={option} value={option}>
                  {builtIns[option]}
                </MenuRadioItem>
              ))}
              {customThemes.map(({ id, name: themeName }) => (
                <MenuRadioItem key={id} value={customChoice(id)}>
                  {themeName}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
      </div>
      {children}
    </div>
  );
}
