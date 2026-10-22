import { useCallback, useDeferredValue, useMemo, useReducer, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { referenceGroups, rowGroups } from "./groups.ts";
import { initialReferenceState, referenceIndex, referenceReducer } from "./reference-state.ts";
import { matchRows } from "./search.ts";
import { TierSection } from "./TierSection.tsx";
import { TokenSearch } from "./TokenSearch.tsx";
import { TokenTargetContext, useHashTarget } from "./TokenTargetContext.tsx";

const tiers = ["primitive", "semantic", "component"] as const;

/**
 * The token reference: search, then the three tiers, with the open groups and links to rows
 * (ds-tokens §5.2, §7, §9). `children` (the diagram and overview) come first and share its links,
 * so a link anywhere on the page opens the group it points into.
 */
export function TokenReference({ children }: { children?: ReactNode }) {
  const [state, dispatch] = useReducer(referenceReducer, initialReferenceState);
  // While typing, the tiers show the previous query's state (open groups and rows together) until
  // the new one renders in the background, so typing stays responsive (R11.7). Toggles, reveals and
  // an emptied query apply at once: a link's navigation needs its row laid out (§7.2).
  const deferred = useDeferredValue(state);
  const shown = state.query === "" || state.query === deferred.query ? state : deferred;
  const matches = useMemo(() => matchRows(referenceIndex, shown.query), [shown.query]);

  // Flushed, so a link's own navigation lands on a laid-out row (§7.2).
  const reveal = useCallback((row: string) => {
    if (!rowGroups.has(row)) return false;
    flushSync(() => {
      dispatch({ type: "reveal", row });
    });
    return true;
  }, []);
  useHashTarget(reveal);

  const onGroupOpenChange = useCallback((group: string, open: boolean) => {
    dispatch({ type: "toggle", group, open });
  }, []);
  const onQueryChange = useCallback((next: string) => {
    dispatch({ type: "search", query: next });
  }, []);

  return (
    <TokenTargetContext value={reveal}>
      {children}
      <TokenSearch
        query={state.query}
        resultQuery={shown.query}
        count={matches?.size ?? null}
        onQueryChange={onQueryChange}
      />
      {tiers.map((tier) => (
        <TierSection
          key={tier}
          tier={tier}
          groups={referenceGroups[tier]}
          openGroups={shown.openGroups}
          matches={matches}
          onGroupOpenChange={onGroupOpenChange}
        />
      ))}
    </TokenTargetContext>
  );
}
