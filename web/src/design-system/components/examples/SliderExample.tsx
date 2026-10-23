import { Slider } from "@/components/Slider";

export function SliderExample() {
  return (
    <Slider
      label="Corner radius"
      min={0}
      max={24}
      defaultValue={4}
      formatValue={(value) => `${String(value)}px`}
    />
  );
}
