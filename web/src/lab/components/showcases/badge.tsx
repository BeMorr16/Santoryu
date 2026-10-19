import { Badge, type BadgeOwnProps, type BadgeProps } from "../../../components/Badge/Badge.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";

const props = {
  as: { type: '"span" | "li"', default: '"span"', description: "The root element." },
  variant: {
    type: '"neutral" | "accent"',
    default: '"neutral"',
    description: "Emphasis only, not meaning.",
  },
  size: { type: '"sm" | "md"', default: '"md"', description: "Text size and padding." },
} satisfies PropDocs<BadgeOwnProps & Pick<BadgeProps, "as">>;

function Examples() {
  return (
    <>
      <Example title="Variants and sizes">
        <Badge>Neutral</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge size="sm">Small</Badge>
        <Badge variant="accent" size="sm">
          Small accent
        </Badge>
      </Example>
      <Example title="A tech stack, as a list">
        <Stack as="ul" direction="horizontal" gap="xs" aria-label="Tech stack">
          {["React", "TypeScript", "AWS"].map((item) => (
            <Badge key={item} as="li">
              {item}
            </Badge>
          ))}
          <Badge as="li" variant="accent">
            New
          </Badge>
        </Stack>
      </Example>
    </>
  );
}

export const badgeShowcase: Showcase = {
  id: "badge",
  name: "Badge",
  exports: ["Badge"],
  purpose: "A short, non-interactive label, such as one item of a tech stack.",
  Examples,
  props: [{ part: "Badge", docs: props }],
  tokens: "badge",
  a11y: [
    "Plain text in a span or li: not focusable, no pointer cursor, no hover state.",
    "Variants are emphasis only and carry no meaning, so color alone is fine.",
  ],
};
