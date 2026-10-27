import { describe, expect, it } from "vitest";
import { contactContent } from "./contact.ts";

describe("contact content (contact R2.8)", () => {
  it("keeps the meta description within 160 characters (R1.3)", () => {
    expect(contactContent.description.length).toBeLessThanOrEqual(160);
  });

  it("publishes no email address (R2.7)", () => {
    for (const [slot, text] of Object.entries(contactContent)) {
      expect(text, slot).not.toContain("@");
      expect(text, slot).not.toContain("mailto:");
    }
  });
});
