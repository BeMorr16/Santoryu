import { useRef } from "react";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../../components/Menu/Menu.tsx";
import { emptySource, type DraftStart } from "./model/draft.ts";
import { presets } from "./model/presets.ts";

const builtInStarts: readonly DraftStart[] = [
  { label: "Light", name: "", editing: null, source: emptySource("light") },
  { label: "Dark", name: "", editing: null, source: emptySource("dark") },
];

const presetStarts: readonly DraftStart[] = presets.map((preset) => ({
  label: preset.name,
  name: "",
  editing: null,
  source: preset.source,
}));

/**
 * Where a new theme starts (theme-creator-controls R3; design §4.1): Light and Dark, the presets,
 * or a tokens file. Saved themes aren't here: their cards' Duplicate replaces that.
 */
export function NewThemeMenu({
  onStart,
  onImportFile,
}: {
  onStart: (start: DraftStart) => void;
  onImportFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const item = (start: DraftStart) => (
    <MenuItem
      key={start.label}
      onSelect={() => {
        onStart(start);
      }}
    >
      {start.label}
    </MenuItem>
  );
  return (
    <>
      <Menu>
        <MenuTrigger iconEnd="chevron-down">New theme</MenuTrigger>
        <MenuPopup align="end">
          {builtInStarts.map(item)}
          <MenuSeparator />
          {presetStarts.map(item)}
          <MenuSeparator />
          <MenuItem
            icon="upload"
            onSelect={() => {
              fileRef.current?.click();
            }}
          >
            Import file…
          </MenuItem>
        </MenuPopup>
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          // Cleared, so choosing the same file again still fires a change.
          input.value = "";
          if (file) onImportFile(file);
        }}
      />
    </>
  );
}
