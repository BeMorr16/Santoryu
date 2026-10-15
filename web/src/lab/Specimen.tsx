import type { CSSProperties } from "react";
import type { TokenMeta } from "../tokens/types.ts";
import styles from "./Specimen.module.css";

const kindByGroup: Record<string, string> = {
  "type.family": "fontFamily",
  "type.size": "fontSize",
  "type.weight": "fontWeight",
  "type.leading": "lineHeight",
  "effect.elevation": "shadow",
  "effect.focus-ring.width": "ringWidth",
  "effect.focus-ring.offset": "ringOffset",
};

const kindByCategory: Partial<Record<TokenMeta["category"], string>> = {
  color: "swatch",
  space: "bar",
  radius: "radius",
};

const textKinds = new Set(["fontFamily", "fontSize", "fontWeight", "lineHeight"]);

function specimenKind(token: TokenMeta): string | undefined {
  const group = token.name.split(".").slice(0, 2).join(".");
  return kindByGroup[token.name] ?? kindByGroup[group] ?? kindByCategory[token.category];
}

/** A decorative preview styled with the token's own custom property. Motion has none (R7.6). */
export function Specimen({ token }: { token: TokenMeta }) {
  const kind = specimenKind(token);
  if (kind === undefined) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className={styles.visuallyHidden}>No preview</span>
      </>
    );
  }
  const style = { "--specimen": `var(${token.cssVar})` } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={`${styles.specimen ?? ""} ${styles[kind] ?? ""}`}
      style={style}
    >
      {textKinds.has(kind) ? "Aa" : null}
    </span>
  );
}
