import type { ComponentPropsWithRef } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "../Menu/Menu.tsx";
import type { ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import { themePreferences, writePreference, type ThemePreference } from "../../theme/preference.ts";
import { useEffectiveTheme } from "../../theme/useEffectiveTheme.ts";
import styles from "./ThemeSwitcher.module.css";

const labels: Record<ThemePreference, string> = { light: "Light", dark: "Dark" };
const icons: Record<ThemePreference, IconName> = { light: "sun", dark: "moon" };

export type ThemeSwitcherOwnProps = Pick<ButtonLookProps, "variant" | "size">;

export type ThemeSwitcherProps = ThemeSwitcherOwnProps &
  Omit<ComponentPropsWithRef<"div">, "children">;

/**
 * Light or Dark for the whole site (R13). Until the visitor chooses, it shows and follows their
 * OS scheme; a choice is remembered.
 */
export function ThemeSwitcher({
  variant = "ghost",
  size = "sm",
  className,
  ...rest
}: ThemeSwitcherProps) {
  const theme = useEffectiveTheme();
  return (
    <Menu {...rest} className={cx(styles.switcher, className)}>
      <MenuTrigger variant={variant} size={size}>
        {/* CSS shows the icon for the theme in effect, so it's right from the first paint. */}
        <Icon name="sun" className={styles.lightIcon} />
        <Icon name="moon" className={styles.darkIcon} />
        <span className={styles.label} aria-hidden="true">
          Theme
        </span>
        {/* The name says the theme in effect (R13.2), once it's known after hydration. */}
        <VisuallyHidden>{theme === null ? "Theme" : `Theme: ${labels[theme]}`}</VisuallyHidden>
      </MenuTrigger>
      <MenuPopup>
        <MenuRadioGroup label="Theme" value={theme ?? undefined} onValueChange={writePreference}>
          {themePreferences.map((option) => (
            <MenuRadioItem key={option} value={option} icon={icons[option]}>
              {labels[option]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}
