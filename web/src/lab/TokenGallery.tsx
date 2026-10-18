import { useId } from "react";
import { componentTokens, semanticTokens } from "../tokens/metadata.ts";
import { ComponentTokenTable } from "./ComponentTokenTable.tsx";
import { tokenCategories, type TokenCategory } from "../tokens/types.ts";
import styles from "./TokenGallery.module.css";
import { TokenTable } from "./TokenTable.tsx";

const categoryLabels: Record<TokenCategory, string> = {
  color: "Color",
  type: "Type",
  space: "Space",
  size: "Size",
  radius: "Radius",
  motion: "Motion",
  effect: "Effect",
};

function CategorySection({ category }: { category: TokenCategory }) {
  const headingId = useId();
  const label = categoryLabels[category];
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{label}</h2>
      <TokenTable
        caption={`${label} tokens`}
        tokens={semanticTokens.filter((token) => token.category === category)}
      />
    </section>
  );
}

/** Kebab-case component names that have tokens, in first-seen (file) order. */
export const tokenizedComponents = [...new Set(componentTokens.map((token) => token.component))];

function ComponentSection() {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>Component tokens</h2>
      <p>
        Each component&apos;s styling hooks. Every one aliases a semantic token, so themes reach it,
        and overriding it on a wrapper restyles just that part of the page.
      </p>
      {tokenizedComponents.map((component) => (
        <ComponentTokens key={component} component={component} />
      ))}
    </section>
  );
}

function ComponentTokens({ component }: { component: string }) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId}>
        <code>{component}</code>
      </h3>
      <ComponentTokenTable component={component} caption={`${component} component tokens`} />
    </section>
  );
}

export function TokenGallery() {
  return (
    <div className={styles.gallery}>
      {tokenCategories.map((category) => (
        <CategorySection key={category} category={category} />
      ))}
      <ComponentSection />
    </div>
  );
}
