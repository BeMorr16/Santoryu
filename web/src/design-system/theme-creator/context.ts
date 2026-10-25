import { createContext, type Dispatch } from "react";
import type { DraftAction } from "./model/draft.ts";
import type { TraceId } from "./model/chain.ts";

/** The draft's dispatch: stable, so rows don't need it passed down (design §8.2). */
export const DraftDispatch = createContext<Dispatch<DraftAction>>(() => undefined);

/** Sets what the chain panel traces: a row or key control that got focus or input (R8.1). */
export const TraceTarget = createContext<(id: TraceId) => void>(() => undefined);
