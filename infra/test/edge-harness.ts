import { runInNewContext } from "node:vm";

export type QueryString = Record<string, { value: string; multiValue?: { value: string }[] }>;

/**
 * Evaluates rendered CloudFront Function code in an empty context (no Node globals), in strict
 * mode as the cloudfront-js-2.0 runtime does, and returns its `handler`.
 */
export function loadHandler(code: string): (event: object) => unknown {
  return runInNewContext(`"use strict";\n${code}\n;handler`, Object.create(null) as object) as (
    event: object,
  ) => unknown;
}

/** Builds a CloudFront `querystring` object the way CloudFront parses `a=1&b=2&a=3`. */
export function querystring(pairs: [string, string][]): QueryString {
  const result: QueryString = {};
  for (const [key, value] of pairs) {
    const existing = result[key];
    if (!existing) {
      result[key] = { value };
    } else {
      existing.multiValue = [...(existing.multiValue ?? [{ value: existing.value }]), { value }];
    }
  }
  return result;
}
