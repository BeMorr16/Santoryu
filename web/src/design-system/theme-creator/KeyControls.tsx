import { useContext, type ReactNode } from "react";
import { Button } from "../../components/Button/Button.tsx";
import { ColorField } from "../../components/ColorField/ColorField.tsx";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { Slider } from "../../components/Slider/Slider.tsx";
import { DraftDispatch, TraceTarget } from "./context.ts";
import { keyRanges, type SectionId } from "./model/controls.ts";
import { keyLabels, type ColorKeyId } from "./model/families.ts";
import { fontIds, type FontId, type KeyId, type KeyValues } from "./model/types.ts";
import { focusControl } from "./focus.ts";
import { keySwatches } from "./swatches.ts";
import styles from "./ThemeCreator.module.css";

export const fontNames: Record<FontId, string> = {
  "space-grotesk": "Space Grotesk",
  inter: "Inter",
  "fira-code": "Fira Code",
};

const px = (value: number) => `${String(value)}px`;
/** Density as the spacing step it makes, at the default 16px root (design §5.4). */
const densityPx = (rem: number) => px(Math.round(rem * 16 * 10) / 10);
const percent = (scale: number) => `${String(Math.round(scale * 100))}%`;

const densityMarks = [
  { value: 0.2, label: "Compact" },
  { value: 0.25, label: "Default" },
  { value: 0.3, label: "Roomy" },
];

/** The key controls in each section, in order (R5.1, R5.4–R5.6). */
const sectionKeys: Record<SectionId, readonly KeyId[]> = {
  color: ["action", "accent", "accent2", "background"],
  typography: ["headingFont", "bodyFont", "typeScale"],
  shape: ["radius", "borderWidth"],
  spacing: ["density"],
};

/**
 * One key control, traced by the chain panel when it gets focus or input (R8.1), with a Reset
 * shown only while it differs from the starting point (R5.8).
 */
function KeyControl({
  id,
  changed,
  children,
}: {
  id: KeyId;
  changed: boolean;
  children: ReactNode;
}) {
  const dispatch = useContext(DraftDispatch);
  const trace = useContext(TraceTarget);
  const onTrace = () => {
    trace(`key:${id}`);
  };
  return (
    <div
      className={styles.keyControl}
      data-key={id}
      onFocusCapture={onTrace}
      onInputCapture={onTrace}
    >
      {children}
      {changed && (
        <Button
          variant="ghost"
          size="sm"
          iconStart="reset"
          className={styles.reset}
          onClick={(event) => {
            dispatch({ type: "resetKey", key: id });
            // The button goes once the key is reset, so focus moves to the control it reset.
            focusControl(event.currentTarget);
          }}
        >
          Reset {keyLabels[id]}
        </Button>
      )}
    </div>
  );
}

function ColorKey({ id, value }: { id: ColorKeyId; value: KeyValues[ColorKeyId] }) {
  const dispatch = useContext(DraftDispatch);
  return (
    <ColorField
      label={keyLabels[id]}
      value={value}
      swatches={keySwatches[id]}
      onValueChange={(hex) => {
        dispatch({ type: "setKey", key: id, value: hex });
      }}
    />
  );
}

function FontKey({ id, value }: { id: "headingFont" | "bodyFont"; value: FontId }) {
  const dispatch = useContext(DraftDispatch);
  return (
    <Menu>
      <MenuTrigger iconEnd="chevron-down">
        {keyLabels[id]}: {fontNames[value]}
      </MenuTrigger>
      <MenuPopup>
        <MenuRadioGroup<FontId>
          label={keyLabels[id]}
          value={value}
          onValueChange={(font) => {
            dispatch({ type: "setKey", key: id, value: font });
          }}
        >
          {fontIds.map((font) => (
            <MenuRadioItem key={font} value={font} closeOnSelect>
              {fontNames[font]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}

type SliderKeyId = keyof typeof keyRanges;

const sliderFormats: Record<SliderKeyId, (value: number) => string> = {
  typeScale: percent,
  radius: px,
  borderWidth: px,
  density: densityPx,
};

const sliderHints: Record<SliderKeyId, string> = {
  typeScale: "How much larger headings and the lead are than body text. Body text stays 1rem.",
  radius: "Corners of controls and surfaces. Pills stay round.",
  borderWidth: "Every border and outline.",
  density: "The step every space token is a multiple of.",
};

function SliderKey({ id, value }: { id: SliderKeyId; value: number }) {
  const dispatch = useContext(DraftDispatch);
  return (
    <Slider
      label={keyLabels[id]}
      hint={sliderHints[id]}
      {...keyRanges[id]}
      value={value}
      formatValue={sliderFormats[id]}
      marks={id === "density" ? densityMarks : undefined}
      onValueChange={(next) => {
        dispatch({ type: "setKey", key: id, value: next });
      }}
    />
  );
}

/** A section's key controls (R5): the draft's values, and where it started, for Reset. */
export function KeyControls({
  section,
  keys,
  start,
}: {
  section: SectionId;
  keys: KeyValues;
  start: KeyValues;
}) {
  return (
    <div className={styles.keys}>
      {sectionKeys[section].map((id) => (
        <KeyControl key={id} id={id} changed={keys[id] !== start[id]}>
          {id === "action" || id === "accent" || id === "accent2" || id === "background" ? (
            <ColorKey id={id} value={keys[id]} />
          ) : id === "headingFont" || id === "bodyFont" ? (
            <FontKey id={id} value={keys[id]} />
          ) : (
            <SliderKey id={id} value={keys[id]} />
          )}
        </KeyControl>
      ))}
    </div>
  );
}
