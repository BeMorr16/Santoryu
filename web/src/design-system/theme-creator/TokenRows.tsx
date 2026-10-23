import { memo, useContext, useState, type ReactNode } from "react";
import { Badge } from "../../components/Badge/Badge.tsx";
import { Button } from "../../components/Button/Button.tsx";
import { ColorField } from "../../components/ColorField/ColorField.tsx";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { VisuallyHidden } from "../../components/VisuallyHidden/VisuallyHidden.tsx";
import { DraftDispatch, TraceTarget } from "./context.ts";
import { focusControl } from "./focus.ts";
import { fontNames } from "./KeyControls.tsx";
import {
  componentOptions,
  inRange,
  semanticControl,
  type SemanticControl,
} from "./model/controls.ts";
import { keyLabels } from "./model/families.ts";
import { overrideValue } from "./model/resolve.ts";
import { fontOf, parseDimension } from "./model/values.ts";
import {
  fontIds,
  keyIds,
  type FontId,
  type Hex,
  type TokenValueInput,
  type ValueSource,
} from "./model/types.ts";
import {
  families,
  familyName,
  familyOfRef,
  primitiveInFamily,
  rampSwatches,
  type Family,
} from "./swatches.ts";
import styles from "./ThemeCreator.module.css";

/** Where a value came from, as its badge says it (R6.1). */
export function sourceLabel(source: ValueSource, startLabel: string): string {
  if (source === "edited") return "Edited";
  if (source === "base") return `From ${startLabel}`;
  const key = keyIds.find((id) => `key:${id}` === source);
  return key ? `From ${keyLabels[key]}` : `From ${startLabel}`;
}

/** A row: traced by the chain panel on focus or input, and found by "Edit <token>" (R8.1, R3.3). */
function Row({ token, children }: { token: string; children: ReactNode }) {
  const trace = useContext(TraceTarget);
  const onTrace = () => {
    trace(token);
  };
  return (
    <li className={styles.row} data-token={token} onFocusCapture={onTrace} onInputCapture={onTrace}>
      {children}
    </li>
  );
}

function SourceBadge({ source, startLabel }: { source: ValueSource; startLabel: string }) {
  return (
    <Badge size="sm" variant={source === "edited" ? "accent" : "neutral"} className={styles.badge}>
      {sourceLabel(source, startLabel)}
    </Badge>
  );
}

function ResetButton({ token, onReset }: { token: string; onReset: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      iconStart="reset"
      className={styles.reset}
      onClick={(event) => {
        onReset();
        // The button goes once the token is reset, so focus moves to the control it reset.
        focusControl(event.currentTarget);
      }}
    >
      Reset <VisuallyHidden>{token}</VisuallyHidden>
    </Button>
  );
}

function ColorControl({
  token,
  hex,
  colorRef,
}: {
  token: string;
  hex: Hex;
  colorRef?: string | undefined;
}) {
  const dispatch = useContext(DraftDispatch);
  // One ramp at a time, starting at the value's own (design §8.4, owner 2026-10-22).
  const [family, setFamily] = useState<Family>(familyOfRef(colorRef) ?? "gray");
  return (
    <div className={styles.colorControl}>
      <ColorField
        label={token}
        value={hex}
        swatches={rampSwatches[family]}
        swatchesLabel={`${familyName(family)} swatches`}
        onValueChange={(next) => {
          dispatch({
            type: "setSemantic",
            token,
            value: { kind: "color", hex: next, ref: primitiveInFamily(family, next) },
          });
        }}
      />
      <Menu>
        <MenuTrigger size="sm" iconEnd="chevron-down">
          Family: {familyName(family)} <VisuallyHidden>({token})</VisuallyHidden>
        </MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup<Family> label="Family" value={family} onValueChange={setFamily}>
            {families.map((option) => (
              <MenuRadioItem key={option} value={option} closeOnSelect>
                {familyName(option)}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
    </div>
  );
}

/** What's typed, kept only while the value is the one it was typed for (as ColorField's hex). */
interface NumberDraft {
  text: string;
  for: string;
  error: boolean;
}

function NumberControl({
  token,
  css,
  control,
}: {
  token: string;
  css: string;
  control: Extract<SemanticControl, { kind: "dimension" | "number" }>;
}) {
  const dispatch = useContext(DraftDispatch);
  const value = parseDimension(css)?.value ?? Number(css);
  const [draft, setDraft] = useState<NumberDraft | null>(null);
  const active = draft?.for === css ? draft : null;
  const unit = control.unit ?? "";
  const parse = (text: string) => {
    const number = text.trim() === "" ? Number.NaN : Number(text);
    return inRange(number, control) ? number : null;
  };
  return (
    <TextField
      label={token}
      type="number"
      size="sm"
      hint={unit === "" ? undefined : unit}
      min={control.min}
      max={control.max}
      step={control.step}
      value={active?.text ?? String(value)}
      error={
        active?.error === true
          ? `Enter a value from ${String(control.min)} to ${String(control.max)}${unit === "" ? "" : ` ${unit}`}.`
          : undefined
      }
      onChange={(event) => {
        const text = event.currentTarget.value;
        const next = parse(text);
        if (next === null) {
          setDraft({ text, for: css, error: active?.error === true });
          return;
        }
        const input: TokenValueInput =
          control.kind === "dimension"
            ? { kind: "dimension", value: next, unit: control.unit }
            : { kind: "number", value: next };
        // Colors aside, a value's CSS doesn't depend on the base.
        const nextCss = overrideValue(token, input, "light").css;
        setDraft({ text, for: nextCss, error: false });
        dispatch({ type: "setSemantic", token, value: input });
      }}
      onBlur={() => {
        if (active && parse(active.text) === null) setDraft({ ...active, error: true });
      }}
    />
  );
}

function FontControl({ token, css }: { token: string; css: string }) {
  const dispatch = useContext(DraftDispatch);
  const font = fontOf(css);
  return (
    <div className={styles.labelled}>
      <code className={styles.path}>{token}</code>
      <Menu>
        <MenuTrigger size="sm" iconEnd="chevron-down">
          {font ? fontNames[font] : css} <VisuallyHidden>({token})</VisuallyHidden>
        </MenuTrigger>
        <MenuPopup>
          <MenuRadioGroup<FontId>
            label="Family"
            value={font}
            onValueChange={(next) => {
              dispatch({ type: "setSemantic", token, value: { kind: "font", font: next } });
            }}
          >
            {fontIds.map((option) => (
              <MenuRadioItem key={option} value={option} closeOnSelect>
                {fontNames[option]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
    </div>
  );
}

export interface SemanticRowProps {
  token: string;
  css: string;
  /** For a color: its hex (a translucent color's, without its alpha). */
  hex?: Hex | undefined;
  /** The primitive it comes from, if it still is one. */
  colorRef?: string | undefined;
  source: ValueSource;
  startLabel: string;
}

/**
 * One semantic token (R6.1): its path, where its value came from, a control for its type, and
 * Reset once edited (R6.3). Memoized, with plain props, so editing one row re-renders only it.
 */
export const SemanticRow = memo(function SemanticRow({
  token,
  css,
  hex,
  colorRef,
  source,
  startLabel,
}: SemanticRowProps) {
  const dispatch = useContext(DraftDispatch);
  const control = semanticControl(token);
  return (
    <Row token={token}>
      <SourceBadge source={source} startLabel={startLabel} />
      {control.kind === "color" && hex !== undefined ? (
        <ColorControl token={token} hex={hex} colorRef={colorRef} />
      ) : control.kind === "font" ? (
        <FontControl token={token} css={css} />
      ) : control.kind === "dimension" || control.kind === "number" ? (
        <NumberControl token={token} css={css} control={control} />
      ) : (
        <div className={styles.labelled}>
          <code className={styles.path}>{token}</code>
          <span className={styles.value}>{css} (fixed)</span>
        </div>
      )}
      {source === "edited" && (
        <ResetButton
          token={token}
          onReset={() => {
            dispatch({ type: "resetSemantic", token });
          }}
        />
      )}
    </Row>
  );
});

export interface ComponentRowProps {
  token: string;
  /** The semantic it aliases now. */
  target: string;
  edited: boolean;
}

/**
 * One component token (R6.2): the semantic it aliases, re-pointable to another of its options.
 * Its menu's options mount only while it's open, so hundreds of rows stay light.
 */
export const ComponentRow = memo(function ComponentRow({
  token,
  target,
  edited,
}: ComponentRowProps) {
  const dispatch = useContext(DraftDispatch);
  const [open, setOpen] = useState(false);
  const options = componentOptions(token);
  return (
    <Row token={token}>
      <Badge size="sm" variant={edited ? "accent" : "neutral"} className={styles.badge}>
        {edited ? "Edited" : "Default"}
      </Badge>
      <div className={styles.labelled}>
        <code className={styles.path}>{token}</code>
        {options.length > 1 ? (
          <Menu open={open} onOpenChange={setOpen}>
            <MenuTrigger size="sm" iconEnd="chevron-down">
              {target} <VisuallyHidden>(for {token})</VisuallyHidden>
            </MenuTrigger>
            <MenuPopup>
              {open && (
                <MenuRadioGroup
                  label="Aliases"
                  value={target}
                  onValueChange={(next) => {
                    dispatch({ type: "setComponent", token, target: next });
                  }}
                >
                  {options.map((option) => (
                    <MenuRadioItem key={option} value={option} closeOnSelect>
                      {option}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              )}
            </MenuPopup>
          </Menu>
        ) : (
          <span className={styles.value}>Aliases {target} (fixed)</span>
        )}
      </div>
      {edited && (
        <ResetButton
          token={token}
          onReset={() => {
            dispatch({ type: "resetComponent", token });
          }}
        />
      )}
    </Row>
  );
});
