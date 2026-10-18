import type { ComponentPropsWithRef, ElementType } from "react";

/**
 * Props of a component whose root element is chosen by `as` from a closed union `E` (R3.4).
 * Element-specific props type-check against the chosen element (`href` only with `as="a"`), and
 * `ref` reaches the root element (R3.2: React 19 passes it as a regular prop).
 */
export type PolymorphicProps<E extends ElementType, Own> = Own & {
  as?: E;
} & Omit<ComponentPropsWithRef<E>, keyof Own | "as">;
