import type { ReactNode } from "react";
import { Button } from "../../components/Button/Button.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { listRole } from "../../components/shared/layout.ts";
import { Typography } from "../../components/Typography/Typography.tsx";
import { componentPath } from "../components/pages.ts";
import type { FlowChain } from "./flow.ts";
import styles from "./FlowDiagram.module.css";
import type { Tier } from "./groups.ts";
import { tierSections } from "./reference-ids.ts";
import { tierRules } from "./stats.ts";
import { TokenNode } from "./TokenNode.tsx";

const tierNames: Record<Tier, string> = {
  primitive: "Primitive",
  semantic: "Semantic",
  component: "Component",
};

/** A tier's name (linking to its h2), count and rule, then its nodes (R2.2). */
function TierColumn({ tier, count, children }: { tier: Tier; count: number; children: ReactNode }) {
  return (
    <li className={styles.tier}>
      <p className={styles.head}>
        <Typography as="span" variant="label">
          <Link href={`#${tierSections[tier].id}`}>{tierNames[tier]}</Link>
        </Typography>{" "}
        <span className={styles.count}>{count} tokens</span>
      </p>
      <p className={styles.rule}>{tierRules[tier]}</p>
      {children}
    </li>
  );
}

/**
 * How one value reaches the page, from metadata: four tiers in a list, read in order, with the
 * worked example's chain through them (ds-tokens R2). The arrows are generated content, so they
 * stay out of the accessibility tree and the list's count (§4.2).
 */
export function FlowDiagram({ chain, counts }: { chain: FlowChain; counts: Record<Tier, number> }) {
  const { component, semantic, primitives, page } = chain;
  return (
    <figure className={styles.diagram}>
      <Typography as="figcaption" variant="small" tone="muted">
        How a value reaches the page: a primitive holds it, a semantic token names its purpose (and
        picks a primitive per theme), a component token styles one part, and the component reads
        only its own tokens.
      </Typography>
      {/* Markers are off, so the list role is restated for Safari (R2.8). */}
      <ol className={styles.tiers} {...listRole("ol", undefined)}>
        <TierColumn tier="primitive" count={counts.primitive}>
          <ul className={styles.nodes} {...listRole("ul", undefined)}>
            {primitives.map(({ label, token }) => (
              <li key={label ?? token.name}>
                <TokenNode token={token} label={label}>
                  <code>{token.css}</code>
                </TokenNode>
              </li>
            ))}
          </ul>
        </TierColumn>
        <TierColumn tier="semantic" count={counts.semantic}>
          <TokenNode token={semantic}>
            {semantic.themed ? (
              <>
                Light <code>{semantic.values.light.css}</code>, Dark{" "}
                <code>{semantic.values.dark.css}</code>
              </>
            ) : (
              <code>{semantic.values.all.css}</code>
            )}
          </TokenNode>
        </TierColumn>
        <TierColumn tier="component" count={counts.component}>
          <TokenNode token={component}>
            aliases <code>{component.aliases}</code>
          </TokenNode>
        </TierColumn>
        <li className={styles.tier}>
          <p className={styles.head}>
            <Typography as="span" variant="label">
              Site
            </Typography>
          </p>
          <p className={styles.rule}>Components read only their own tokens.</p>
          <div className={styles.siteNode}>
            <Link href={componentPath(page.id)}>{page.name}</Link>
            {/* The real component with the real tokens, so it can't drift; not a control (R2.6). */}
            <span inert aria-hidden="true" className={styles.preview}>
              <Button variant="primary" size="sm">
                Send
              </Button>
            </span>
          </div>
        </li>
      </ol>
    </figure>
  );
}
