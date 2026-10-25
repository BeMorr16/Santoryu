import type { Ref } from "react";

/** Sets a consumer ref and an internal one to the same node. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}
