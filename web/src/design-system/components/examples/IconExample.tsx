import { Icon } from "@/components/Icon";
import { Stack } from "@/components/Stack";

export function IconExample() {
  return (
    <Stack as="ul" direction="horizontal" gap="md">
      <li>
        <Icon name="mail" /> Email
      </li>
      <li>
        <Icon name="github" /> GitHub
      </li>
      <li>
        <Icon name="linkedin" /> LinkedIn
      </li>
    </Stack>
  );
}
