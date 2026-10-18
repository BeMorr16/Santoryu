/** Joins class names, skipping empty and falsy entries (R3.3: consumer classes add, never replace). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
