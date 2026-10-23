import { ColorField } from "@/components/ColorField";

export function ColorFieldExample() {
  return (
    <ColorField
      label="Action color"
      hint="Buttons and links use it."
      defaultValue="#185480"
      swatches={[
        { value: "#185480", name: "Blue 700" },
        { value: "#c49a4e", name: "Gold 500" },
        { value: "#5b3fa6", name: "Violet 600" },
        { value: "#2a8556", name: "Green 600" },
      ]}
    />
  );
}
