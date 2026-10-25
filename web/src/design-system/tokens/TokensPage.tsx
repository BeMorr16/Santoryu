import { Typography } from "../../components/Typography/Typography.tsx";
import { BackToDesignSystem } from "../BackToDesignSystem.tsx";
import styles from "../DocLayout.module.css";
import { OnThisPage } from "../components/OnThisPage.tsx";
import { flowChain, workedExample } from "./flow.ts";
import { FlowDiagram } from "./FlowDiagram.tsx";
import { OverviewTopics } from "./OverviewTopics.tsx";
import { tokensToc } from "./reference-ids.ts";
import { tierCounts } from "./stats.ts";
import { TokenReference } from "./TokenReference.tsx";

/** Static data: resolved once, and a broken example fails the prerender (R2.7). */
const chain = flowChain(workedExample);

/**
 * /design-system/tokens (ds-tokens R1): the concept first (the diagram and four topics), then the
 * reference. Composition only (R9.2).
 */
export function TokensPage() {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <BackToDesignSystem />
        <h1>Tokens</h1>
        <Typography variant="lead">
          Every design token behind this site, and how they reach the page.
        </Typography>
      </div>
      <OnThisPage className={styles.toc} items={tokensToc} />
      <div className={styles.content}>
        <TokenReference>
          <FlowDiagram chain={chain} counts={tierCounts} />
          <OverviewTopics />
        </TokenReference>
      </div>
    </div>
  );
}
