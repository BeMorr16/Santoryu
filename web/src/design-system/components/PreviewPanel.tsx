import { useState, type ReactNode } from "react";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import styles from "./PreviewPanel.module.css";

const themes = { site: "Site", light: "Light", dark: "Dark" } as const;
type PreviewTheme = keyof typeof themes;

/**
 * Examples in a theme chosen for this panel only (R15.6). Light and Dark set data-theme on the
 * panel; Site follows the page. The choice is state only, never persisted. `label` names the panel
 * ("Button examples") and ends its theme trigger's name.
 */
export function PreviewPanel({ label, children }: { label: string; children: ReactNode }) {
  const [theme, setTheme] = useState<PreviewTheme>("site");
  return (
    <div
      className={styles.panel}
      data-theme={theme === "site" ? undefined : theme}
      role="group"
      aria-label={label}
    >
      <div className={styles.toolbar}>
        <Menu>
          {/* The name starts with the visible text (WCAG 2.5.3), then says which panel. */}
          <MenuTrigger size="sm" iconEnd="chevron-down">
            Theme: {themes[theme]} <VisuallyHidden>({label} preview)</VisuallyHidden>
          </MenuTrigger>
          <MenuPopup>
            <MenuRadioGroup label="Preview theme" value={theme} onValueChange={setTheme}>
              {(Object.keys(themes) as PreviewTheme[]).map((option) => (
                <MenuRadioItem key={option} value={option}>
                  {themes[option]}
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
