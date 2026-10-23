import { ColorField } from "@/components/ColorField";

export function ColorFieldExample() {
  return (
    <ColorField
      label="Action color"
      hint="Buttons and links use it."
      defaultValue="#b37500"
      swatches={[
        { value: "#b37500", name: "Gold 600" },
        { value: "#1c87a5", name: "Cyan 500" },
        { value: "#5b3fa6", name: "Violet 600" },
        { value: "#2a8556", name: "Green 600" },
      ]}
    />
  );
}
