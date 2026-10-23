import {
  useId,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cx } from "../shared/cx.ts";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./Slider.module.css";

export interface SliderMark {
  value: number;
  label: string;
}

export interface SliderOwnProps {
  /** Visible label, and the accessible name. Required (an accessibility rule, decision 0008). */
  label: string;
  /** Hide the label visually; it still names the slider. The value text stays visible. */
  hideLabel?: boolean | undefined;
  /** Help text under the label, referenced by aria-describedby. */
  hint?: ReactNode;
  /** The value as text: shown beside the label and announced as aria-valuetext. Default `String`. */
  formatValue?: ((value: number) => string) | undefined;
  /** Labelled stops shown under the track. On a mark, the value text leads with its label. */
  marks?: readonly SliderMark[] | undefined;
  /** Called with the new value as a number, alongside native `onChange`. */
  onValueChange?: ((value: number) => void) | undefined;
}

/** Native range input props go to the `<input>`; `className` and `style` go to the wrapper. */
export type SliderProps = SliderOwnProps &
  Omit<
    ComponentPropsWithRef<"input">,
    keyof SliderOwnProps | "type" | "children" | "value" | "defaultValue" | "min" | "max" | "step"
  > & {
    value?: number | undefined;
    defaultValue?: number | undefined;
    /** Default 0. */
    min?: number | undefined;
    /** Default 100. */
    max?: number | undefined;
    /** Default 1. */
    step?: number | undefined;
  };

/** A range input's value before any change: the native default, half way from min to max. */
function nativeDefault(min: number, max: number, step: number): number {
  if (max < min) return min;
  const half = min + (max - min) / 2;
  return Math.min(max, min + Math.round((half - min) / step) * step);
}

/** "Default, 4px" on a mark, otherwise just the formatted value (theme-creator R13.4). */
export function sliderValueText(
  value: number,
  format: (value: number) => string,
  marks: readonly SliderMark[] = [],
): string {
  const mark = marks.find((candidate) => candidate.value === value);
  return mark ? `${mark.label}, ${format(value)}` : format(value);
}

/** Where a value sits along the track, from 0 to 1. */
const position = (value: number, min: number, max: number) =>
  max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

/**
 * A labelled native range input with its value as visible text, and optional marks (theme-creator
 * R13). Arrow keys, Page Up/Down, Home and End work as the browser's own.
 */
export function Slider({
  label,
  hideLabel = false,
  hint,
  formatValue = String,
  marks,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  className,
  style,
  id: idProp,
  "aria-describedby": ariaDescribedby,
  ...rest
}: SliderProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}hint`;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  // Uncontrolled, the value text follows the input; controlled, it's derived from `value`.
  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? nativeDefault(min, max, step),
  );
  const current = value ?? uncontrolled;
  const text = formatValue(current);
  const labelElement = (
    <label htmlFor={id} className={styles.label}>
      {label}
    </label>
  );

  return (
    <div className={cx(styles.root, className)} style={style}>
      <div className={styles.header}>
        {hideLabel ? <VisuallyHidden>{labelElement}</VisuallyHidden> : labelElement}
        {/* Not an <output>: its status role would announce every step on top of the slider. */}
        <span className={styles.value}>{text}</span>
      </div>
      {hasHint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <input
        {...rest}
        id={id}
        type="range"
        className={styles.input}
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        aria-valuetext={sliderValueText(current, formatValue, marks)}
        aria-describedby={cx(hasHint && hintId, ariaDescribedby) || undefined}
        style={{ "--_fill": `${String(position(current, min, max) * 100)}%` } as CSSProperties}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const next = event.currentTarget.valueAsNumber;
          setUncontrolled(next);
          onValueChange?.(next);
          onChange?.(event);
        }}
      />
      {marks && marks.length > 0 && (
        <ul className={styles.marks} aria-hidden="true">
          {marks.map((mark) => (
            <li
              key={mark.value}
              className={styles.mark}
              style={{ "--_pos": String(position(mark.value, min, max)) } as CSSProperties}
            >
              {mark.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
