import { describe, expect, it } from "vitest";
import { cx } from "./cx.ts";

describe("cx", () => {
  it("joins class names with single spaces, in order", () => {
    expect(cx("a", "b", "c")).toBe("a b c");
  });

  it("skips false, null, undefined and empty strings", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("returns an empty string when nothing is left", () => {
    expect(cx(undefined, false)).toBe("");
  });
});
