import { Figure } from "@/components/Figure";
import elk from "../images/bull-elk-1280.jpg";

export function FigureExample() {
  return (
    <Figure
      src={elk}
      width={1280}
      height={853}
      alt="A bull elk with a wide rack of antlers stands side-on in a mown field by a road."
      caption="Bull elk, Yellowstone National Park."
    />
  );
}
