import {
  Button,
  type ButtonOwnProps,
  type ButtonProps,
} from "../../../components/Button/Button.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";
import styles from "../Showcase.module.css";

const variants = ["primary", "secondary", "ghost"] as const;

export const buttonLookDocs = {
  variant: {
    type: '"primary" | "secondary" | "ghost"',
    default: '"secondary"',
    description:
      "Emphasis: one primary action per view, secondary for the rest, ghost for toolbars.",
  },
  size: { type: '"sm" | "md"', default: '"md"', description: "32px or 40px tall." },
  iconStart: { type: "IconName", description: "Decorative icon before the label." },
  iconEnd: { type: "IconName", description: "Decorative icon after the label." },
} satisfies PropDocs<ButtonOwnProps>;

/** Button's own props, plus the native ones it treats differently. */
export const buttonDocs = {
  ...buttonLookDocs,
  type: {
    type: '"button" | "submit" | "reset"',
    default: '"button"',
    description: 'Defaults to "button", not the native "submit".',
  },
  disabled: {
    type: "boolean",
    default: "false",
    description:
      "Sets aria-disabled, not the native attribute: still focusable, announced, and never activated.",
  },
} satisfies PropDocs<ButtonOwnProps & Pick<ButtonProps, "type" | "disabled">>;

function Examples() {
  return (
    <>
      <Example title="Variants">
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </Example>
      <Example title="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
      </Example>
      <Example title="Icons">
        <Button variant="primary" iconEnd="arrow-right">
          Get in touch
        </Button>
        <Button iconStart="mail">Email me</Button>
        <Button variant="ghost" size="sm" iconStart="github" aria-label="GitHub" />
      </Example>
      <Example title="Disabled (still focusable)">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} disabled>
            Sending…
          </Button>
        ))}
      </Example>
      <Example title="Customized with a component token" layout="column">
        <div className={styles.brandCta}>
          <Button variant="primary" iconEnd="arrow-right">
            See the projects
          </Button>
        </div>
        <pre className={styles.code}>
          <code>{`.brandCta {
  --component-button-primary-background: var(--color-accent-text);
  --component-button-primary-border: var(--color-accent-text);
  --component-button-primary-background-hover: var(--color-link-hover);
}`}</code>
        </pre>
      </Example>
    </>
  );
}

export const buttonShowcase: Showcase = {
  id: "button",
  name: "Button",
  exports: ["Button"],
  purpose: "A native button for actions, in three levels of emphasis.",
  Examples,
  props: [{ part: "Button", docs: buttonDocs }],
  tokens: "button",
  keyboard: [
    { keys: "Enter / Space", action: "Activates the button (never while disabled)." },
    { keys: "Tab", action: "Moves focus to it, including when disabled." },
  ],
  a11y: [
    'Always a native <button>, type="button" unless set.',
    "Named by its text. Icon-only buttons need aria-label or aria-labelledby (a type error otherwise).",
    "disabled sets aria-disabled, not the native attribute: it stays focusable and announced, and blocks clicks, keys and form submission.",
    "Target size at least 32px tall; focus ring 2px and 3:1 against the surface.",
  ],
};
