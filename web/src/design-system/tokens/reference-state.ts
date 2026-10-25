import { referenceTokens, rowGroups } from "./groups.ts";
import { matchRows, searchIndex } from "./search.ts";

/** The reference's search index, built once: the token data is static. */
export const referenceIndex = searchIndex(referenceTokens);

/** What the visitor has asked for: a query, and which groups are open (ds-tokens §9.2). */
export interface ReferenceState {
  query: string;
  openGroups: ReadonlySet<string>;
}

export type ReferenceAction =
  | { type: "search"; query: string }
  | { type: "toggle"; group: string; open: boolean }
  | { type: "reveal"; row: string };

export const initialReferenceState: ReferenceState = { query: "", openGroups: new Set() };

/** The groups holding at least one of these rows. */
function groupsOf(rows: ReadonlySet<string>): Set<string> {
  return new Set([...rows].flatMap((row) => rowGroups.get(row) ?? []));
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((item) => b.has(item));

/**
 * Every change to the reference, in one place:
 * - a new query opens exactly the groups with matches, or closes all when empty (R11.3, R11.5, R11.6);
 * - between queries, groups toggle freely (R11.6);
 * - a link to a row opens its group, clearing a query that hides the row first (R7.1, R11.8).
 *   Open groups stay open, so the group holding the link (and focus) doesn't close under it.
 *
 * An unchanged open set keeps its identity, so the tier sections can skip re-rendering.
 */
export function referenceReducer(state: ReferenceState, action: ReferenceAction): ReferenceState {
  switch (action.type) {
    case "search": {
      const matches = matchRows(referenceIndex, action.query);
      const open = matches === null ? new Set<string>() : groupsOf(matches);
      return {
        query: action.query,
        openGroups: sameSet(open, state.openGroups) ? state.openGroups : open,
      };
    }
    case "toggle": {
      if (state.openGroups.has(action.group) === action.open) return state;
      const open = new Set(state.openGroups);
      if (action.open) open.add(action.group);
      else open.delete(action.group);
      return { ...state, openGroups: open };
    }
    case "reveal": {
      const group = rowGroups.get(action.row);
      if (group === undefined) return state;
      const hidden = matchRows(referenceIndex, state.query)?.has(action.row) === false;
      if (hidden) return { query: "", openGroups: new Set(state.openGroups).add(group) };
      if (state.openGroups.has(group)) return state;
      return { ...state, openGroups: new Set(state.openGroups).add(group) };
    }
  }
}
