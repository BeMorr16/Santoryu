/** Elements a layout component may render as (R8.2, R9.3). */
export type LayoutElement =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "footer"
  | "nav"
  | "main"
  | "ul"
  | "ol"
  | "li"
  | "form"
  | "fieldset";

/** Gap steps. Vertical gaps use `space.stack.*`, horizontal ones `space.inline.*`. */
export type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Lists keep their semantics without markers. Safari drops the list role when `list-style` is
 * none, so it's restated explicitly unless the consumer set a role.
 */
export function listRole(as: string, role: string | undefined): { role?: string } {
  if (role !== undefined) return { role };
  return as === "ul" || as === "ol" ? { role: "list" } : {};
}
