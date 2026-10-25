import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cx } from "../shared/cx.ts";
import { TextField } from "../TextField/TextField.tsx";
import { TooltipBase } from "../Tooltip/Tooltip.tsx";
import styles from "./ColorField.module.css";

/** An sRGB color as lowercase `#rrggbb`. */
export type Hex = `#${string}`;

export interface ColorSwatch {
  value: Hex;
  /** The swatch button's accessible name, e.g. "Blue 700". */
  name: string;
}

export interface ColorFieldOwnProps {
  /** The visible legend, naming the group and the color picker. Required (decision 0008). */
  label: string;
  /** Help text under the legend, describing the group. */
  hint?: ReactNode;
  /** Controlled value, `#rrggbb`. */
  value?: Hex | undefined;
  /** Uncontrolled initial value. Default `#000000`. */
  defaultValue?: Hex | undefined;
  /** Called with each new valid value, lowercase `#rrggbb`. */
  onValueChange?: ((value: Hex) => void) | undefined;
  /** Suggested colors, shown as buttons; the one matching the value is pressed. */
  swatches?: readonly ColorSwatch[] | undefined;
  /** The swatch group's accessible name. Default "Suggested colors". */
  swatchesLabel?: string | undefined;
  /** Disables the picker, the hex field and the swatches. */
  disabled?: boolean | undefined;
}

/** Native `<fieldset>` props go to the fieldset, the root. */
export type ColorFieldProps = ColorFieldOwnProps &
  Omit<ComponentPropsWithRef<"fieldset">, keyof ColorFieldOwnProps | "children" | "onChange">;

const hexPattern = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * `#rgb`, `#rrggbb` or either without `#`, in any case, as lowercase `#rrggbb`; anything else is
 * null (theme-creator R14.3).
 */
export function parseHex(text: string): Hex | null {
  const digits = hexPattern.exec(text.trim())?.[1]?.toLowerCase();
  if (digits === undefined) return null;
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  return `#${full}`;
}

/** What's typed in the hex field, kept only while the value is the one it was typed for. */
interface HexDraft {
  text: string;
  for: Hex;
  error: boolean;
}

/**
 * A color input: a native color picker and a hex field under one legend, kept in sync, with
 * optional swatches (theme-creator R14). The hex is always shown as text, so the value never
 * relies on color alone.
 */
export function ColorField({
  label,
  hint,
  value,
  defaultValue = "#000000",
  onValueChange,
  swatches,
  swatchesLabel = "Suggested colors",
  disabled,
  className,
  "aria-describedby": ariaDescribedby,
  ...rest
}: ColorFieldProps) {
  const id = useId();
  const legendId = `${id}legend`;
  const hintId = `${id}hint`;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const [uncontrolled, setUncontrolled] = useState<Hex>(defaultValue);
  const current = value ?? uncontrolled;
  const [draft, setDraft] = useState<HexDraft | null>(null);
  // Derived, not synced: a value set elsewhere (the picker, a swatch, the parent) replaces the text.
  const active = draft?.for === current ? draft : null;

  function commit(next: Hex) {
    setUncontrolled(next);
    if (next !== current) onValueChange?.(next);
  }

  return (
    <fieldset
      {...rest}
      className={cx(styles.root, className)}
      disabled={disabled}
      aria-describedby={cx(hasHint && hintId, ariaDescribedby) || undefined}
    >
      <legend id={legendId} className={styles.legend}>
        {label}
      </legend>
      {hasHint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <div className={styles.controls}>
        <input
          type="color"
          className={styles.picker}
          aria-labelledby={legendId}
          value={current}
          onChange={(event) => {
            const next = parseHex(event.currentTarget.value);
            if (next) commit(next);
          }}
        />
        <TextField
          label="Hex"
          size="sm"
          className={styles.hex}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          value={active?.text ?? current}
          error={active?.error === true ? "Enter a hex color, like #1a4d80." : undefined}
          onChange={(event) => {
            const text = event.currentTarget.value;
            const next = parseHex(text);
            setDraft({
              text,
              for: next ?? current,
              error: next === null && active?.error === true,
            });
            if (next) commit(next);
          }}
          onBlur={() => {
            if (active && parseHex(active.text) === null) setDraft({ ...active, error: true });
          }}
        />
      </div>
      {swatches && swatches.length > 0 && (
        <div role="group" aria-label={swatchesLabel} className={styles.swatches}>
          {swatches.map((swatch) => (
            <TooltipBase key={swatch.value} name={swatch.name} description={swatch.value}>
              <button
                type="button"
                className={styles.swatch}
                aria-label={swatch.name}
                aria-pressed={swatch.value === current}
                style={{ "--_swatch": swatch.value } as CSSProperties}
                onClick={() => {
                  commit(swatch.value);
                }}
              />
            </TooltipBase>
          ))}
        </div>
      )}
    </fieldset>
  );
}
