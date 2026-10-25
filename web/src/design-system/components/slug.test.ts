import { describe, expect, it } from "vitest";
import { slug } from "./slug.ts";

describe("slug", () => {
  it.each([
    ["Variants", "variants"],
    ["Component tokens", "component-tokens"],
    ["Disabled (still focusable)", "disabled-still-focusable"],
    ["Few items, stretch={false}", "few-items-stretch-false"],
    ["  Spaced  out  ", "spaced-out"],
    ["min sm", "min-sm"],
    ["Skip link (Tab to it)", "skip-link-tab-to-it"],
  ])("turns %j into %j", (text, id) => {
    expect(slug(text)).toBe(id);
  });
});
