import { useId } from "react";
import { tokens } from "../generated/tokens.ts";
import { tokenCategories, type TokenCategory } from "../tokens/types.ts";
import styles from "./TokenGallery.module.css";
import { TokenTable } from "./TokenTable.tsx";

const categoryLabels: Record<TokenCategory, string> = {
  color: "Color",
  type: "Type",
  space: "Space",
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
        tokens={tokens.filter((token) => token.category === category)}
      />
    </section>
  );
}

export function TokenGallery() {
  return (
    <div className={styles.gallery}>
      {tokenCategories.map((category) => (
        <CategorySection key={category} category={category} />
      ))}
    </div>
  );
}
