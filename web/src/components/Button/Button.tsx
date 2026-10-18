import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";
import { ButtonContent, buttonClassName, type ButtonLookProps } from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";

export type ButtonOwnProps = ButtonLookProps;

/** A label, or an accessible name for an icon-only button (R4.4). */
type ButtonLabel =
  | { children: ReactNode }
  | { children?: never; "aria-label": string }
  | { children?: never; "aria-labelledby": string };

export type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithRef<"button">, keyof ButtonOwnProps | "children"> &
  ButtonLabel;

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
      className={cx(buttonClassName({ variant, size }), className)}
    >
      <ButtonContent iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
    </button>
  );
}
