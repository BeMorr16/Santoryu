import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type AriaAttributes,
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
  /** Hide the label visually; it still names the field. Not with `required` or `optional`, whose visible cues are in the label. */
  hideLabel?: boolean | undefined;
  /** Add a visible " (optional)" to the label, for a form that marks its optional fields. Not with `required`. */
  optional?: boolean | undefined;
  /** Help text under the label, referenced by aria-describedby. */
  hint?: ReactNode;
  /** Error message: sets aria-invalid and is referenced by aria-describedby after the hint. */
  error?: ReactNode;
  /** Control height, matching Button. In a multiline field, where its first line of text sits. Default "md". */
  size?: "sm" | "md" | undefined;
  /** Render a `<textarea>`. Native textarea props then apply, and `type`, `iconStart` and `clearable` don't. */
  multiline?: boolean | undefined;
  /** A multiline field's visible lines. Default 6. */
  rows?: number | undefined;
  /** Default "text". */
  type?: "text" | "search" | "email" | "url" | "tel" | "number" | undefined;
  /** A decorative icon at the start of the field. A search field gets `search` unless this names another. */
  iconStart?: IconName | undefined;
  /** Opt in to the clear button (an X at the inline end) while the field has a value. Default: type === "search". */
  clearable?: boolean | undefined;
  /** The clear button's name. Default `Clear ${label}`. */
  clearLabel?: string | undefined;
}

/**
 * A hidden label would hide the visible "(required)" or "(optional)" too, leaving sighted users no
 * cue (WCAG 3.3.2), so they don't combine. A field can't be both required and optional.
 */
type LabelRule =
  | { hideLabel?: false | undefined; required?: boolean | undefined; optional?: false | undefined }
  | { hideLabel?: false | undefined; required?: false | undefined; optional?: boolean | undefined }
  | { hideLabel: true; required?: false | undefined; optional?: false | undefined };

type SingleLineOnly = "type" | "iconStart" | "clearable" | "clearLabel";

type BaseOwnProps = Omit<TextFieldOwnProps, "multiline" | "rows" | "optional" | "hideLabel">;

type SingleLineProps = BaseOwnProps & {
  multiline?: false | undefined;
  rows?: never;
} & Omit<ComponentPropsWithRef<"input">, keyof TextFieldOwnProps | "children" | "required">;

type MultilineProps = Omit<BaseOwnProps, SingleLineOnly> & {
  multiline: true;
  rows?: number | undefined;
} & { [K in SingleLineOnly]?: never } & Omit<
    ComponentPropsWithRef<"textarea">,
    keyof TextFieldOwnProps | "children" | "required"
  >;

/** Native props go to the `<input>` or `<textarea>`; `className` and `style` go to the wrapper (decision 0011). */
export type TextFieldProps = LabelRule & (SingleLineProps | MultilineProps);

/** What the field gives its control, whichever element that is. */
interface ControlWiring {
  id: string;
  required: boolean | undefined;
  "aria-invalid": AriaAttributes["aria-invalid"];
  "aria-describedby": string | undefined;
}

/** Empties the input the way the browser's own clear button does, so `onChange` sees an ordinary change. */
function clearInput(input: HTMLInputElement) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * A labelled native text input or textarea with an optional hint and error (ds-tokens R10,
 * contact-form R15). A single-line field can have a start icon and a clear button: a search field
 * shows a search icon that hides while it has focus, and a clear button; any other type opts in to
 * clearing with `clearable`.
 */
export function TextField({
  label,
  hideLabel = false,
  optional = false,
  hint,
  error,
  size = "md",
  className,
  style,
  required,
  id: idProp,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...control
}: TextFieldProps) {
  const generatedId = useId();
  // A caller's id wins, so an error summary or another label can point at the input.
  const id = idProp ?? generatedId;
  const hintId = `${id}hint`;
  const errorId = `${id}error`;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const hasError = error !== undefined && error !== null && error !== false;
  const wiring: ControlWiring = {
    id,
    required,
    "aria-invalid": hasError ? true : ariaInvalid,
    "aria-describedby": cx(hasHint && hintId, hasError && errorId, ariaDescribedby) || undefined,
  };

  const labelContent = (
    <label htmlFor={id} className={styles.label}>
      {required || optional ? `${label} ` : label}
      {/* Native `required` already announces it, so the visible words aren't read twice (R10.6). */}
      {required && (
        <span aria-hidden="true" className={styles.cue}>
          (required)
        </span>
      )}
      {/* Nothing else announces this one, so it stays in the accessible name (contact-form R15.3). */}
      {optional && <span className={styles.cue}>(optional)</span>}
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
      {/* multiline is cleared because it chooses the element, and isn't a DOM attribute. */}
      {control.multiline ? (
        <MultilineControl {...control} multiline={undefined} wiring={wiring} />
      ) : (
        <SingleLineControl
          {...control}
          multiline={undefined}
          wiring={wiring}
          label={label}
          hideLabel={hideLabel}
        />
      )}
      {hasError && (
        <p id={errorId} className={styles.error}>
          <Icon name="warning" className={styles.errorIcon} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type ControlProps<P> = Omit<
  P,
  "multiline" | "label" | "hint" | "error" | "size" | "className" | "style" | "id"
> & {
  multiline?: undefined;
  wiring: ControlWiring;
};

function MultilineControl({ rows = 6, wiring, ...rest }: ControlProps<MultilineProps>) {
  return (
    <textarea {...rest} {...wiring} rows={rows} className={cx(styles.input, styles.multiline)} />
  );
}

function SingleLineControl({
  label,
  hideLabel,
  wiring,
  type = "text",
  iconStart = type === "search" ? "search" : undefined,
  clearable = type === "search",
  clearLabel = `Clear ${label}`,
  ref,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  disabled,
  readOnly,
  ...rest
}: ControlProps<SingleLineProps> & { label: string; hideLabel: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable, so a consumer's callback ref isn't detached and reattached on every render.
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
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

  return (
    // With the label hidden, the icon is the only visible cue, so it stays (WCAG 3.3.2).
    <div className={cx(styles.control, type === "search" && !hideLabel && styles.searchIcon)}>
      {iconStart && <Icon name={iconStart} className={styles.icon} />}
      <input
        {...rest}
        {...wiring}
        ref={setInputRef}
        type={type}
        className={styles.input}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
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
  );
}
