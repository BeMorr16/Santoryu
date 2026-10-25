import { runInNewContext } from "node:vm";

/**
 * Evaluates rendered CloudFront Function code in an empty context (no Node globals), in strict
 * mode as the cloudfront-js-2.0 runtime does, and returns its `handler`. Shared by the edge
 * function unit tests and the e2e edge emulator, so both run exactly the code that's deployed.
 */
export function loadHandler(code: string): (event: object) => unknown {
  return runInNewContext(`"use strict";\n${code}\n;handler`, Object.create(null) as object) as (
    event: object,
  ) => unknown;
}
