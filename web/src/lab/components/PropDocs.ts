export interface PropDoc {
  /** The type as written for readers, e.g. `"primary" | "secondary"`. */
  type: string;
  default?: string;
  description: string;
}

/**
 * One entry per own prop of `P`, no more and no less (R15.4): declare a showcase's table
 * `satisfies PropDocs<OwnProps>`, and an undocumented or removed prop fails `typecheck`.
 */
export type PropDocs<P> = {
  [K in keyof Required<P>]: PropDoc;
};
