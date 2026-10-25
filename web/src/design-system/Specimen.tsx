import type { CSSProperties } from "react";
import { cx } from "../components/shared/cx.ts";
import { semanticTokens } from "../tokens/metadata.ts";
import type { AnyTokenMeta } from "../tokens/types.ts";
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
  "effect.grid": "lineWidth",
  "effect.underline.thickness": "underlineThickness",
  "effect.underline.thickness-hover": "underlineThickness",
  "effect.underline.offset": "underlineOffset",
};

/** Groups with no preview, checked before the category: a 480px breakpoint bar, an 80dvh image-cap bar or a 65ch measure bar would only widen the table. */
const noSpecimen = new Set(["size.breakpoint", "size.viewport", "type.measure"]);

const kindByCategory: Partial<Record<AnyTokenMeta["category"], string>> = {
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

/**
 * A component token previews like the semantic token it aliases, and a primitive like the first
 * semantic token aliasing it; an unused primitive falls back to its category (ds-tokens §6.3).
 */
function specimenKind(token: AnyTokenMeta): string | undefined {
  if (token.tier === "primitive") {
    const user = semanticTokens.find((semantic) => semantic.name === token.usedBy[0]);
    return user ? specimenKind(user) : kindByCategory[token.category];
  }
  const name = token.tier === "component" ? token.aliases : token.name;
  const group = name.split(".").slice(0, 2).join(".");
  if (noSpecimen.has(group)) return undefined;
  return kindByGroup[name] ?? kindByGroup[group] ?? kindByCategory[token.category];
}

/**
 * A decorative preview styled with the token's own custom property, or a primitive's literal value
 * (it has no property). Motion, layer, breakpoints, the viewport caps and the measure have none
 * (R7.6, refinement R11.5, R12.14, R18.7).
 */
export function Specimen({
  token,
  value: literal,
  className,
}: {
  token: AnyTokenMeta;
  /** A literal value to preview instead, such as the theme creator's draft value (R8.3). */
  value?: string | undefined;
  className?: string;
}) {
  const kind = specimenKind(token);
  if (kind === undefined) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className={styles.visuallyHidden}>No preview</span>
      </>
    );
  }
  const value = literal ?? (token.tier === "primitive" ? token.css : `var(${token.cssVar})`);
  const style = { "--specimen": value } as CSSProperties;
  return (
    <span aria-hidden="true" className={cx(styles.specimen, styles[kind], className)} style={style}>
      {textKinds.has(kind) ? "Aa" : null}
    </span>
  );
}
