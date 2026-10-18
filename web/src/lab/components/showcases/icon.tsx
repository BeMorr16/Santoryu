import type { ReactNode } from "react";
import { Icon, type IconOwnProps } from "../../../components/Icon/Icon.tsx";
import {
  icons,
  weightMap,
  type IconName,
  type IconWeight,
} from "../../../components/Icon/registry.ts";
import { Link } from "../../../components/Link/Link.tsx";
import { Stack } from "../../../components/Stack/Stack.tsx";
import { semanticTokens } from "../../../tokens/metadata.ts";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const names = Object.keys(icons) as IconName[];
const sizes = ["inherit", "sm", "md", "lg"] as const;
const weights = Object.keys(weightMap) as IconWeight[];

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

/** A size's caption with its resolved value, so it follows token edits. */
function sizeCaption(size: (typeof sizes)[number]): string {
  if (size === "inherit") return "inherit (1em)";
  const token = semanticTokens.find((t) => t.name === `size.icon.${size}`);
  if (token === undefined || token.themed) throw new Error(`size.icon.${size} is not a size token`);
  return `${size} (${token.values.all.css})`;
}

/** Icons with visible captions. The caption names each one, so the icons are decorative. */
function Tiles({ tiles }: { tiles: readonly { caption: string; icon: ReactNode }[] }) {
  return (
    <Stack as="ul" direction="horizontal" gap="md" wrap>
      {tiles.map(({ caption, icon }) => (
        <li key={caption} className={styles.tile}>
          {icon}
          <code>{caption}</code>
        </li>
      ))}
    </Stack>
  );
}

function Examples() {
  return (
    <>
      <Example title="Registry">
        <Tiles
          tiles={names.map((name) => ({ caption: name, icon: <Icon name={name} size="lg" /> }))}
        />
      </Example>
      <Example title="Sizes">
        <Tiles
          tiles={sizes.map((size) => ({
            caption: sizeCaption(size),
            icon: <Icon name="sun" size={size} />,
          }))}
        />
      </Example>
      <Example title="Weights">
        <Tiles
          tiles={weights.map((weight) => ({
            caption: weight,
            icon: <Icon name="moon" size="lg" weight={weight} />,
          }))}
        />
      </Example>
      <Example title="Inherits text size" layout="column">
        <p className={styles.textH2}>
          <Icon name="check" size="inherit" /> Heading-size text, heading-size icon
        </p>
        <p className={styles.textSmall}>
          <Icon name="check" size="inherit" /> Small text, small icon
        </p>
      </Example>
      <Example title="Takes text color">
        <Link href="/lab/tokens">
          Design tokens <Icon name="arrow-right" />
        </Link>
        <span className={styles.accentText}>
          <Icon name="check" /> Accent-colored text and icon
        </span>
      </Example>
      <Example title="Decorative, inline in running text">
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
  propsNote:
    "SVG attributes (fill, stroke, viewBox, width, height, transform) and children also reach the <svg> as escape hatches: fill replaces currentColor; viewBox and children depend on the icon family's 256-unit grid; width and height are overridden by the size classes, so size an icon with the size prop or a class. Children must not be focusable or include <title> or <desc>: the name comes only from label.",
  tokens: null,
  tokensNote:
    "None. Size comes from the size prop (size.icon.*), color from currentColor, and the default weight is a registry constant.",
  a11y: [
    "Decorative by default: aria-hidden and not focusable.",
    "Never focusable, and named only by label: aria-labelledby and tabIndex are blocked.",
    'With label: role="img", named by the label.',
    "Colored by currentColor unless fill is passed, so it matches its text's contrast. A custom fill on a labelled icon must meet 3:1 against its background.",
    "Where a visible caption names an icon, the icon stays decorative so the name isn't announced twice.",
  ],
};
