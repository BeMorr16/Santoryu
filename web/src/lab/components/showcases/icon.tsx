import { Icon, type IconOwnProps } from "../../../components/Icon/Icon.tsx";
import { icons, type IconName } from "../../../components/Icon/registry.ts";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";

const names = Object.keys(icons) as IconName[];

const props = {
  name: {
    type: names.map((name) => `"${name}"`).join(" | "),
    description: "A registry name. Anything else is a type error.",
  },
  label: {
    type: "string",
    description: "Accessible name. Without one the icon is decorative and hidden.",
  },
  size: {
    type: '"inherit" | "sm" | "md" | "lg"',
    default: '"inherit"',
    description: "inherit follows the text size (1em); the others use size.icon.*.",
  },
  weight: {
    type: '"light" | "regular" | "bold" | "fill" | "duotone"',
    default: '"regular"',
    description: "Normalized weight, mapped onto the icon family's own weights.",
  },
} satisfies PropDocs<IconOwnProps>;

function Examples() {
  return (
    <>
      <Example title="Registry (labelled)">
        {names.map((name) => (
          <Icon key={name} name={name} label={`Icon ${name}`} size="lg" />
        ))}
      </Example>
      <Example title="Sizes">
        <Icon name="theme-light" label="Sun, inherited size" />
        <Icon name="theme-light" label="Sun, small" size="sm" />
        <Icon name="theme-light" label="Sun, medium" size="md" />
        <Icon name="theme-light" label="Sun, large" size="lg" />
      </Example>
      <Example title="Weights">
        {(["light", "regular", "bold", "fill", "duotone"] as const).map((weight) => (
          <Icon
            key={weight}
            name="theme-dark"
            label={`Moon, ${weight} weight`}
            size="lg"
            weight={weight}
          />
        ))}
      </Example>
      <Example title="Decorative, inside text">
        <p>
          <Icon name="check" /> Deployed through GitHub Actions.
        </p>
      </Example>
    </>
  );
}

export const iconShowcase: Showcase = {
  id: "icon",
  name: "Icon",
  exports: ["Icon"],
  purpose: "One icon from a typed registry, so the icon family can be swapped in one file.",
  Examples,
  props: [{ part: "Icon", docs: props }],
  tokens: null,
  tokensNote:
    "None. Size comes from the size prop (size.icon.*), color from currentColor, and the default weight is a registry constant.",
  a11y: [
    "Decorative by default: aria-hidden and not focusable.",
    'With label: role="img", named by the label.',
    "Colored by currentColor, so it always matches its text's contrast.",
  ],
};
