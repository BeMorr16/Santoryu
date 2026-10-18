import { useId } from "react";
import { Button } from "../../../components/Button/Button.tsx";
import {
  VisuallyHidden,
  type VisuallyHiddenOwnProps,
  type VisuallyHiddenProps,
} from "../../../components/VisuallyHidden/VisuallyHidden.tsx";
import { Example } from "../Example.tsx";
import type { PropDocs } from "../PropDocs.ts";
import type { Showcase } from "../Showcase.ts";

const props = {
  as: { type: '"span" | "div" | "p" | "a"', default: '"span"', description: "The root element." },
  focusable: {
    type: "boolean",
    default: "false",
    description: "Show the content while it or a descendant has focus, as skip links do.",
  },
} satisfies PropDocs<VisuallyHiddenOwnProps & Pick<VisuallyHiddenProps, "as">>;

function Examples() {
  const noteId = useId();
  return (
    <>
      <Example title="Hidden label">
        <Button iconStart="github" aria-describedby={noteId}>
          <VisuallyHidden>Open the GitHub profile</VisuallyHidden>
        </Button>
        <p id={noteId}>This button has no visible text, only a hidden name.</p>
      </Example>
      <Example title="Focusable (Tab to it)">
        <VisuallyHidden as="a" focusable href="#visually-hidden">
          Skip to the VisuallyHidden section
        </VisuallyHidden>
      </Example>
    </>
  );
}

export const visuallyHiddenShowcase: Showcase = {
  id: "visually-hidden",
  name: "VisuallyHidden",
  exports: ["VisuallyHidden"],
  purpose: "Text that assistive technology announces but the page doesn't show.",
  Examples,
  props: [{ part: "VisuallyHidden", docs: props }],
  tokens: "visually-hidden",
  keyboard: [{ keys: "Tab", action: "With focusable, reaches the content and reveals it." }],
  a11y: [
    "No role of its own: the content keeps its element's semantics (span by default, or as).",
    "Clipped, not display: none, so it stays in the accessibility tree.",
    "focusable reveals it while it or a descendant has focus: the skip-link pattern.",
  ],
};
