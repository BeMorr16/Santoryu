export type QueryString = Record<string, { value: string; multiValue?: { value: string }[] }>;

/**
 * Builds a CloudFront `querystring` object from a raw query such as `a=1&b=2&a=3`. Keys are added
 * in reverse, as the live runtime returned them, so nothing can rely on the object's key order.
 */
export function querystring(raw: string | undefined): QueryString {
  const pairs = (raw ? raw.split("&") : []).map((pair) => {
    const separator = pair.indexOf("=");
    return separator === -1 ? [pair, ""] : [pair.slice(0, separator), pair.slice(separator + 1)];
  });
  const result: QueryString = {};
  for (const [key = "", value = ""] of pairs.reverse()) {
    const existing = result[key];
    if (!existing) {
      result[key] = { value };
    } else {
      existing.multiValue = [...(existing.multiValue ?? [{ value: existing.value }]), { value }];
    }
  }
  return result;
}
