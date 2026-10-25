import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";
import {
  ButtonContent,
  buttonClassName,
  iconOnlyName,
  type ButtonLabel,
  type ButtonLookProps,
} from "../shared/button.tsx";
import { cx } from "../shared/cx.ts";
import { TooltipBase } from "../Tooltip/Tooltip.tsx";

export interface ButtonOwnProps extends ButtonLookProps {
  /**
   * Why it's disabled: announced as its description, and shown on hover, keyboard focus, and a
   * press or tap (refinement R14.11).
   */
  disabledReason?: ReactNode | undefined;
  /** Show an icon-only button's name as a tooltip. Default true (refinement R14.12). */
  nameTooltip?: boolean | undefined;
}

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
 * submission, since all of them reach a button as a click (R4.5, decision 0007 G). With a
 * `disabledReason` or an icon-only name, a tooltip popup follows the button (refinement R14).
 */
export function Button({
  variant,
  size,
  iconStart,
  iconEnd,
  type = "button",
  disabled = false,
  disabledReason,
  nameTooltip = true,
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
  const reason = disabled ? disabledReason : undefined;
  return (
    <TooltipBase
      name={
        nameTooltip
          ? iconOnlyName({
              iconStart,
              iconEnd,
              children,
              "aria-label": rest["aria-label"],
              "aria-labelledby": rest["aria-labelledby"],
            })
          : undefined
      }
      description={reason}
      showOnPress={reason !== undefined && reason !== null}
    >
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
    </TooltipBase>
  );
}
