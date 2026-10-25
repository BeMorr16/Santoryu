import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "../Button/Button.tsx";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { cx } from "../shared/cx.ts";
import { assignRef } from "../shared/ref.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./TextField.module.css";

export interface TextFieldOwnProps {
  /** Visible label, and the accessible name. Required (an accessibility rule, decision 0008). */
  label: string;
  /** Hide the label visually; it still names the field. Not with `required`, whose visible cue is in the label. */
  hideLabel?: boolean | undefined;
  /** Help text under the label, referenced by aria-describedby. */
  hint?: ReactNode;
  /** Error message: sets aria-invalid and is referenced by aria-describedby after the hint. */
  error?: ReactNode;
  /** Default "text". */
  type?: "text" | "search" | "email" | "url" | "tel" | "number" | undefined;
  /** Control height, matching Button. Default "md". */
  size?: "sm" | "md" | undefined;
  /** A decorative icon at the start of the field. A search field gets `search` unless this names another. */
  iconStart?: IconName | undefined;
  /** Opt in to the clear button (an X at the inline end) while the field has a value. Default: type === "search". */
  clearable?: boolean | undefined;
  /** The clear button's name. Default `Clear ${label}`. */
  clearLabel?: string | undefined;
}

/**
 * A hidden label would hide the visible "(required)" too, leaving sighted users no cue (WCAG
 * 3.3.2), so the two don't combine.
 */
type LabelRule =
  | { hideLabel?: false | undefined; required?: boolean | undefined }
  | { hideLabel: true; required?: false | undefined };

/** Native input props go to the `<input>`; `className` and `style` go to the wrapper (decision 0011). */
export type TextFieldProps = TextFieldOwnProps &
  LabelRule &
  Omit<ComponentPropsWithRef<"input">, keyof TextFieldOwnProps | "children" | "required">;

/** Empties the input the way the browser's own clear button does, so `onChange` sees an ordinary change. */
function clearInput(input: HTMLInputElement) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * A labelled native text input with an optional hint, error, start icon and clear button
 * (ds-tokens R10). A search field shows a search icon that hides while it has focus, and a clear
 * button; any other type opts in to clearing with `clearable`.
 */
export function TextField({
  label,
  hideLabel = false,
  hint,
  error,
  type = "text",
  size = "md",
  iconStart = type === "search" ? "search" : undefined,
  clearable = type === "search",
  clearLabel = `Clear ${label}`,
  className,
  style,
  ref,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  required,
  disabled,
  readOnly,
  id: idProp,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  // A caller's id wins, so an error summary or another label can point at the input.
  const id = idProp ?? generatedId;
  const hintId = `${id}hint`;
  const errorId = `${id}error`;
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable, so a consumer's callback ref isn't detached and reattached on every render.
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const hasError = error !== undefined && error !== null && error !== false;
  // Uncontrolled, whether there's a value follows typing; controlled, it's derived (R10.8).
  const [uncontrolledFilled, setUncontrolledFilled] = useState(
    defaultValue !== undefined && String(defaultValue) !== "",
  );
  const filled = value === undefined ? uncontrolledFilled : String(value) !== "";
  // A disabled or read-only value can't be changed, so it can't be cleared either.
  const canClear = clearable && disabled !== true && readOnly !== true;

  function clear() {
    const input = inputRef.current;
    if (!input) return;
    clearInput(input);
    input.focus();
  }

  const labelContent = (
    <label htmlFor={id} className={styles.label}>
      {label}
      {/* Native `required` already announces it, so the visible words aren't read twice (R10.6). */}
      {required && <span aria-hidden="true"> (required)</span>}
    </label>
  );

  return (
    <div
      className={cx(styles.root, styles[size], hasError && styles.invalid, className)}
      style={style}
    >
      {hideLabel ? <VisuallyHidden>{labelContent}</VisuallyHidden> : labelContent}
      {hasHint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {/* With the label hidden, the icon is the only visible cue, so it stays (WCAG 3.3.2). */}
      <div className={cx(styles.control, type === "search" && !hideLabel && styles.searchIcon)}>
        {iconStart && <Icon name={iconStart} className={styles.icon} />}
        <input
          {...rest}
          ref={setInputRef}
          id={id}
          type={type}
          className={styles.input}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={hasError ? true : ariaInvalid}
          aria-describedby={
            cx(hasHint && hintId, hasError && errorId, ariaDescribedby) || undefined
          }
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setUncontrolledFilled(event.currentTarget.value !== "");
            onChange?.(event);
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            onKeyDown?.(event);
            // Unhandled when empty, so Escape can still reach a containing dialog.
            if (event.key === "Escape" && canClear && event.currentTarget.value !== "") {
              // Handled here: a surrounding dialog shouldn't close on the same press.
              event.preventDefault();
              event.stopPropagation();
              clear();
            }
          }}
        />
        {canClear && filled && (
          <Button
            variant="ghost"
            size="sm"
            iconStart="close"
            aria-label={clearLabel}
            className={styles.clear}
            onClick={clear}
          />
        )}
      </div>
      {hasError && (
        <p id={errorId} className={styles.error}>
          <Icon name="warning" className={styles.errorIcon} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
