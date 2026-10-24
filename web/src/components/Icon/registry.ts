/**
 * The one place that knows the icon family (R6.1, R6.5). Swapping families means changing only
 * this file. Per-icon SSR imports keep the bundle to these icons (R6.6) and need no React context.
 */
import type { IconWeight as PhosphorWeight } from "@phosphor-icons/react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr/LinkedinLogo";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { PauseIcon } from "@phosphor-icons/react/dist/ssr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

export const icons = {
  sun: SunIcon,
  moon: MoonIcon,
  "external-link": ArrowSquareOutIcon,
  "arrow-left": ArrowLeftIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-up": ArrowUpIcon,
  "chevron-down": CaretDownIcon,
  check: CheckIcon,
  copy: CopyIcon,
  linkedin: LinkedinLogoIcon,
  github: GithubLogoIcon,
  mail: EnvelopeSimpleIcon,
  warning: WarningIcon,
  search: MagnifyingGlassIcon,
  close: XIcon,
  palette: PaletteIcon,
  download: DownloadSimpleIcon,
  upload: UploadSimpleIcon,
  reset: ArrowCounterClockwiseIcon,
  trash: TrashIcon,
  menu: ListIcon,
  pause: PauseIcon,
  play: PlayIcon,
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
