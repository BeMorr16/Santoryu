import { useId } from "react";
import { Link } from "../../components/Link/Link.tsx";
import { Typography } from "../../components/Typography/Typography.tsx";
import { primitiveTokens } from "../../tokens/primitives.ts";
import { componentPath, tokensPath } from "../components/pages.ts";
import { Specimen } from "../Specimen.tsx";
import { TokenLink } from "../tokens/TokenLink.tsx";
import { TokenNode } from "../tokens/TokenNode.tsx";
import nodeStyles from "../tokens/TokenNode.module.css";
import { semanticByName } from "./model/builtin.ts";
import type { Chain, KeyChain, SemanticChain } from "./model/chain.ts";
import type { ResolvedTheme } from "./model/types.ts";
import styles from "./ThemeCreator.module.css";

/** A semantic token's chain: source, semantic, component tokens, components (R8.2). */
function SemanticChainView({ chain }: { chain: SemanticChain }) {
  const semantic = semanticByName.get(chain.semantic);
  const primitive = primitiveTokens.find(({ name }) => name === chain.primitive);
  const pages = [
    ...new Map(chain.components.flatMap(({ page }) => (page ? [[page.id, page]] : []))).values(),
  ];
  if (!semantic) return null;
  return (
    <ol className={styles.chain}>
      <li>
        {primitive ? (
          <TokenNode token={primitive} page={tokensPath} label="Primitive">
            <code>{primitive.css}</code>
          </TokenNode>
        ) : (
          <div className={nodeStyles.node}>
            <Specimen token={semantic} value={chain.value.css} />
            <Typography as="span" variant="label">
              Custom
            </Typography>
            <code className={nodeStyles.value}>{chain.value.css}</code>
          </div>
        )}
      </li>
      <li>
        <TokenNode token={semantic} page={tokensPath} label="Semantic" specimen={chain.value.css}>
          <code>{chain.value.css}</code>
        </TokenNode>
      </li>
      <li>
        <div className={nodeStyles.node}>
          <Typography as="span" variant="label">
            Component tokens ({chain.components.length})
          </Typography>
          {chain.components.length === 0 ? (
            <span className={nodeStyles.value}>None alias it.</span>
          ) : (
            <ul className={styles.chainList}>
              {chain.components.map(({ token }) => (
                <li key={token}>
                  <code className={nodeStyles.path}>
                    <TokenLink token={token} page={tokensPath} />
                  </code>
                </li>
              ))}
            </ul>
          )}
          {chain.aliasCount > chain.components.length && (
            <span className={nodeStyles.value}>
              {chain.aliasCount} component tokens alias {chain.semantic} in all.
            </span>
          )}
        </div>
      </li>
      <li>
        <div className={nodeStyles.node}>
          <Typography as="span" variant="label">
            Components
          </Typography>
          {pages.length === 0 ? (
            <span className={nodeStyles.value}>Used directly by the site’s own styles.</span>
          ) : (
            <ul className={styles.chainList}>
              {pages.map(({ id, name }) => (
                <li key={id}>
                  <Link href={componentPath(id)}>{name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </li>
    </ol>
  );
}

/** A key control's chain: the semantic tokens it sets, with their values now (R8.2). */
function KeyChainView({ chain, theme }: { chain: KeyChain; theme: ResolvedTheme }) {
  return (
    <div className={nodeStyles.node}>
      <Typography as="span" variant="label">
        {chain.label} sets {chain.tokens.length} semantic tokens
      </Typography>
      <ul className={styles.chainList}>
        {chain.tokens.map((token) => (
          <li key={token}>
            <code className={nodeStyles.path}>
              <TokenLink token={token} page={tokensPath} />
            </code>{" "}
            <code className={nodeStyles.value}>{theme.semantic[token]?.css}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The tracer (R8): the chain of the row or key control that last got focus or input, with live
 * values. A labelled region read on demand: updates never move focus or announce (R8.4).
 */
export function ChainPanel({ chain, theme }: { chain: Chain | undefined; theme: ResolvedTheme }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.chainPanel}>
      <h2 id={headingId}>Token chain</h2>
      <Typography variant="small" tone="muted">
        How the value of the token or control you last used reaches the components.
      </Typography>
      {chain?.kind === "key" ? (
        <KeyChainView chain={chain} theme={theme} />
      ) : chain ? (
        <SemanticChainView chain={chain} />
      ) : null}
    </section>
  );
}
