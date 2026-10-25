import { Button } from "@/components/Button";
import { Stack } from "@/components/Stack";

export function ButtonExample() {
  return (
    <Stack direction="horizontal" gap="sm">
      <Button variant="primary">Save changes</Button>
      <Button>Cancel</Button>
    </Stack>
  );
}
