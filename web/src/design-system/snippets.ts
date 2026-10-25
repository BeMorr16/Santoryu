// Code samples shared by the docs pages. Plain strings, so importing one pulls in no page.

/** Importing and rendering a component, through the alias every main example uses (ds-components R3.3). */
export const usageCode = `import { Button } from "@/components/Button";

export function SaveButton() {
  return <Button variant="primary">Save changes</Button>;
}`;

/** Restyling a component through its tokens, on a wrapper class (ds-components R3.3, ds-tokens R3.3). */
export const stylingCode = `.brand {
  --component-button-primary-background: var(--color-accent-text);
  --component-button-primary-border: var(--color-accent-text);
}`;

/** Using semantic tokens in a page's own CSS (ds-tokens R3.3). */
export const semanticUsageCode = `.note {
  color: var(--color-text-muted);
  padding: var(--space-inset-md);
}`;
