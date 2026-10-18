/**
 * The one place that knows the icon family (R6.1, R6.5). Swapping families means changing only
 * this file. Per-icon SSR imports keep the bundle to these icons (R6.6) and need no React context.
 */
import type { IconWeight as PhosphorWeight } from "@phosphor-icons/react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr/LinkedinLogo";
import { MonitorIcon } from "@phosphor-icons/react/dist/ssr/Monitor";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";

export const icons = {
  "theme-system": MonitorIcon,
  "theme-light": SunIcon,
  "theme-dark": MoonIcon,
  "new-tab": ArrowSquareOutIcon,
  "arrow-right": ArrowRightIcon,
  "chevron-down": CaretDownIcon,
  check: CheckIcon,
  linkedin: LinkedinLogoIcon,
  github: GithubLogoIcon,
  mail: EnvelopeSimpleIcon,
} as const;

/** Our normalized weights → the family's weights. */
export const weightMap = {
  light: "light",
  regular: "regular",
  bold: "bold",
  fill: "fill",
  duotone: "duotone",
} as const satisfies Record<string, PhosphorWeight>;

/** The default weight (decision 0004 implementation answers: a constant, not a CSS token). */
export const defaultWeight = "regular" satisfies keyof typeof weightMap;

export type IconName = keyof typeof icons;
export type IconWeight = keyof typeof weightMap;
