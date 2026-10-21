import { Button } from "@/components/Button";
import { Tooltip } from "@/components/Tooltip";

export function TooltipExample() {
  return (
    <Tooltip content="Copies a link to this page">
      <Button iconStart="copy">Share</Button>
    </Tooltip>
  );
}
