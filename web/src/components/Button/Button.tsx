import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";
import type { IconName } from "../Icon/registry.ts";
import { ButtonContent, buttonClassName, type ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";

export type ButtonOwnProps = ButtonLookProps;

/** A label, or an icon plus an accessible name (R4.4, refinement R3.6). */
type ButtonLabel =
  | { children: ReactNode }
  | ({ children?: never } & ({ "aria-label": string } | { "aria-labelledby": string }) &
      ({ iconStart: IconName } | { iconEnd: IconName }));

/**
 * Disabled only through `disabled` (refinement R3.7). `aria-disabled` is `never`, since hyphenated
 * JSX props are only checked when declared.
 */
export type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithRef<"button">, keyof ButtonOwnProps | "children" | "aria-disabled"> & {
    "aria-disabled"?: never;
  } & ButtonLabel;

/**
 * Always a native <button> (R4.1). `disabled` renders aria-disabled, never the native attribute,
 * so it stays focusable and announced; one click guard blocks the handler, Enter, Space and form
 * submission, since all of them reach a button as a click (R4.5, decision 0007 G).
 */
export function Button({
  variant,
  size,
  iconStart,
  iconEnd,
  type = "button",
  disabled = false,
  onClick,
  className,
  children,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...rest}
      type={type}
      aria-disabled={disabled ? true : undefined}
      onClick={handleClick}
      className={cx(buttonClassName({ variant, size, iconStart, iconEnd, children }), className)}
    >
      <ButtonContent iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
    </button>
  );
}
