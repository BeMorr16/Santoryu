import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Stack } from "@/components/Stack";

export function CardExample() {
  return (
    <Card
      heading="Design tokens"
      headingLevel={2}
      href="/design-system/tokens"
      footer={
        <Stack as="ul" direction="horizontal" gap="xs" aria-label="Formats">
          <Badge as="li">DTCG JSON</Badge>
          <Badge as="li">CSS</Badge>
        </Stack>
      }
    >
      Every color, size and motion value on this site, in light and dark.
    </Card>
  );
}
