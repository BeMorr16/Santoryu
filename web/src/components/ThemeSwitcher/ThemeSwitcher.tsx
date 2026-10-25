import { useRef, type ComponentPropsWithRef } from "react";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  type MenuPopupOwnProps,
} from "../Menu/Menu.tsx";
import type { ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { TooltipBase } from "../Tooltip/Tooltip.tsx";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import { themeCreatorPath } from "../../design-system/components/pages.ts";
import type { StoredTheme } from "../../theme/custom-themes.ts";
import {
  builtInThemes,
  customChoice,
  writePreference,
  type BuiltInTheme,
  type ThemeChoice,
} from "../../theme/preference.ts";
import { useCustomThemes } from "../../theme/useCustomThemes.ts";
import { useEffectiveTheme } from "../../theme/useEffectiveTheme.ts";
import styles from "./ThemeSwitcher.module.css";

const labels: Record<BuiltInTheme, string> = { light: "Light", dark: "Dark" };
const icons: Record<BuiltInTheme, IconName> = { light: "sun", dark: "moon" };

export interface ThemeSwitcherOwnProps
  extends Pick<ButtonLookProps, "variant" | "size">, MenuPopupOwnProps {
  /** Unset: the visible "Theme" shows from 30em up. true: always; false: never (refinement R10.2). */
  showLabel?: boolean | undefined;
  /** While "Theme" isn't displayed, show the name as a tooltip. Default true (refinement R14.13). */
  nameTooltip?: boolean | undefined;
}

/**
 * The trigger's accessible name: the theme in effect, by name, once it's known after hydration
 * (R13.2, theme-creator R9.2). A custom theme that can't be found gives just "Theme".
 */
export function themeSwitcherName(
  theme: ThemeChoice | null,
  customThemes: readonly Pick<StoredTheme, "id" | "name">[] = [],
): string {
  const builtIn = builtInThemes.find((option) => option === theme);
  const name =
    builtIn === undefined
      ? customThemes.find(({ id }) => customChoice(id) === theme)?.name
      : labels[builtIn];
  return name === undefined ? "Theme" : `Theme: ${name}`;
}

export type ThemeSwitcherProps = ThemeSwitcherOwnProps &
  Omit<ComponentPropsWithRef<"div">, "children">;

/**
 * Light, Dark or one of the visitor's custom themes for the whole site (R13, theme-creator R9.1).
 * Until the visitor chooses, it shows and follows their OS scheme; a choice is remembered. A link
 * item leads to the theme creator.
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
  const customThemes = useCustomThemes();
  const name = themeSwitcherName(theme, customThemes);
  const label = useRef<HTMLSpanElement>(null);
  return (
    <Menu {...rest} className={cx(styles.switcher, className)}>
      {/* The chevron shows it opens a menu, so the trigger is never square (refinement R10.3). */}
      {/* The name shows only while the visible "Theme" doesn't (refinement R14.13). */}
      <TooltipBase
        name={nameTooltip && showLabel !== true ? name : undefined}
        shouldShow={() => !label.current?.checkVisibility()}
      >
        <MenuTrigger variant={variant} size={size} iconEnd="chevron-down">
          {/* CSS shows the icon for the theme in effect, so it's right from the first paint. */}
          <Icon name="sun" className={styles.lightIcon} />
          <Icon name="moon" className={styles.darkIcon} />
          <Icon name="palette" className={styles.customIcon} />
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
          <VisuallyHidden>{name}</VisuallyHidden>
        </MenuTrigger>
      </TooltipBase>
      {/* Opens toward the inside of the header's end edge by default (refinement R10.1). */}
      <MenuPopup side={side} align={align}>
        <MenuRadioGroup<ThemeChoice>
          label="Theme"
          value={theme ?? undefined}
          onValueChange={writePreference}
        >
          {builtInThemes.map((option) => (
            // Closes on Space too, unlike other radio items (owner, refinement R5 review).
            <MenuRadioItem key={option} value={option} icon={icons[option]} closeOnSelect>
              {labels[option]}
            </MenuRadioItem>
          ))}
          {customThemes.map(({ id, name: themeName }) => (
            <MenuRadioItem key={id} value={customChoice(id)} icon="palette" closeOnSelect>
              {themeName}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem href={themeCreatorPath} icon="palette">
          {customThemes.length === 0 ? "Create a theme…" : "Edit themes…"}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
