import { Badge } from "@/components/Badge";
import { Stack } from "@/components/Stack";

export function BadgeExample() {
  return (
    <Stack direction="horizontal" gap="xs">
      <Badge>Draft</Badge>
      <Badge variant="success">Published</Badge>
      <Badge variant="warning">In review</Badge>
    </Stack>
  );
}
