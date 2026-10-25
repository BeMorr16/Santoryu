import { Button } from "@/components/Button";
import { Stack } from "@/components/Stack";

export function StackExample() {
  return (
    <Stack direction="horizontal" gap="sm">
      <Button variant="primary">Publish</Button>
      <Button>Preview</Button>
      <Button variant="ghost">Discard</Button>
    </Stack>
  );
}
