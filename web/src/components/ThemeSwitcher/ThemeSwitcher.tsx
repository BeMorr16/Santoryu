import { useRef, type ComponentPropsWithRef } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  type MenuPopupOwnProps,
} from "../Menu/Menu.tsx";
import type { ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { TooltipBase } from "../Tooltip/Tooltip.tsx";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import { themePreferences, writePreference, type ThemePreference } from "../../theme/preference.ts";
import { useEffectiveTheme } from "../../theme/useEffectiveTheme.ts";
import styles from "./ThemeSwitcher.module.css";

const labels: Record<ThemePreference, string> = { light: "Light", dark: "Dark" };
const icons: Record<ThemePreference, IconName> = { light: "sun", dark: "moon" };

export interface ThemeSwitcherOwnProps
  extends Pick<ButtonLookProps, "variant" | "size">, MenuPopupOwnProps {
  /** Unset: the visible "Theme" shows from 30em up. true: always; false: never (refinement R10.2). */
  showLabel?: boolean | undefined;
  /** While "Theme" isn't displayed, show the name as a tooltip. Default true (refinement R14.13). */
  nameTooltip?: boolean | undefined;
}

/** The trigger's accessible name: the theme in effect, once it's known after hydration (R13.2). */
export function themeSwitcherName(theme: ThemePreference | null): string {
  return theme === null ? "Theme" : `Theme: ${labels[theme]}`;
}

export type ThemeSwitcherProps = ThemeSwitcherOwnProps &
  Omit<ComponentPropsWithRef<"div">, "children">;

/**
 * Light or Dark for the whole site (R13). Until the visitor chooses, it shows and follows their
 * OS scheme; a choice is remembered.
 */
export function ThemeSwitcher({
  variant = "ghost",
  size = "sm",
  showLabel,
  nameTooltip = true,
  side,
  align = "end",
  className,
  ...rest
}: ThemeSwitcherProps) {
  const theme = useEffectiveTheme();
  const label = useRef<HTMLSpanElement>(null);
  return (
    <Menu {...rest} className={cx(styles.switcher, className)}>
      {/* The chevron shows it opens a menu, so the trigger is never square (refinement R10.3). */}
      {/* The name shows only while the visible "Theme" doesn't (refinement R14.13). */}
      <TooltipBase
        name={nameTooltip && showLabel !== true ? themeSwitcherName(theme) : undefined}
        shouldShow={() => !label.current?.checkVisibility()}
      >
        <MenuTrigger variant={variant} size={size} iconEnd="chevron-down">
          {/* CSS shows the icon for the theme in effect, so it's right from the first paint. */}
          <Icon name="sun" className={styles.lightIcon} />
          <Icon name="moon" className={styles.darkIcon} />
          {/* A visible label is the start of the accessible name (WCAG 2.5.3). */}
          {showLabel !== false && (
            <span
              ref={label}
              className={showLabel === undefined ? styles.auto : undefined}
              aria-hidden="true"
            >
              Theme
            </span>
          )}
          <VisuallyHidden>{themeSwitcherName(theme)}</VisuallyHidden>
        </MenuTrigger>
      </TooltipBase>
      {/* Opens toward the inside of the header's end edge by default (refinement R10.1). */}
      <MenuPopup side={side} align={align}>
        <MenuRadioGroup label="Theme" value={theme ?? undefined} onValueChange={writePreference}>
          {themePreferences.map((option) => (
            // Closes on Space too, unlike other radio items (owner, refinement R5 review).
            <MenuRadioItem key={option} value={option} icon={icons[option]} closeOnSelect>
              {labels[option]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}
