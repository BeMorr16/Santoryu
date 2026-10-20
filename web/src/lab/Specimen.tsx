import type { CSSProperties } from "react";
import type { TokenMeta } from "../tokens/types.ts";
import styles from "./Specimen.module.css";

const kindByGroup: Record<string, string> = {
  "type.family": "fontFamily",
  "type.size": "fontSize",
  "type.weight": "fontWeight",
  "type.leading": "lineHeight",
  "type.tracking": "letterSpacing",
  "effect.elevation": "shadow",
  "effect.focus-ring.width": "ringWidth",
  "effect.focus-ring.offset": "ringOffset",
  "effect.backdrop": "blur",
  "effect.border": "lineWidth",
  "effect.underline.thickness": "underlineThickness",
  "effect.underline.thickness-hover": "underlineThickness",
  "effect.underline.offset": "underlineOffset",
};

/** Groups with no preview, checked before the category: a 480px breakpoint bar or a 65ch measure bar would only widen the table. */
const noSpecimen = new Set(["size.breakpoint", "type.measure"]);

const kindByCategory: Partial<Record<TokenMeta["category"], string>> = {
  color: "swatch",
  space: "bar",
  size: "bar",
  radius: "radius",
};

const textKinds = new Set([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "underlineThickness",
  "underlineOffset",
]);

/** A component token previews like the semantic token it aliases. */
function specimenKind(token: TokenMeta): string | undefined {
  const name = token.tier === "component" ? token.aliases : token.name;
  const group = name.split(".").slice(0, 2).join(".");
  if (noSpecimen.has(group)) return undefined;
  return kindByGroup[name] ?? kindByGroup[group] ?? kindByCategory[token.category];
}

/** A decorative preview styled with the token's own custom property. Motion, layer, breakpoints and the measure have none (R7.6, refinement R11.5, R12.14). */
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
