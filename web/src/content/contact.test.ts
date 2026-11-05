import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contactContent, contactFormContent } from "./contact.ts";

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

describe("contact form content (contact-form Copy)", () => {
  const contract = JSON.parse(
    readFileSync(
      new URL("../../../services/contact/contract/validation-cases.json", import.meta.url),
      "utf8",
    ),
  ) as { cases: { errors: Record<string, string> }[] };

  it("has words for every error the shared validation cases can produce", () => {
    const errors: Record<string, Record<string, string>> = contactFormContent.errors;
    for (const { errors: expected } of contract.cases) {
      for (const [field, code] of Object.entries(expected)) {
        expect(errors[field]?.[code], `${field}: ${code}`).toEqual(expect.any(String));
      }
    }
  });

  it("publishes no real address: only the example in the email error", () => {
    const text = JSON.stringify(contactFormContent);
    expect(text.replaceAll("name@example.com", "")).not.toContain("@");
    expect(text).not.toContain("mailto:");
  });

  it("names Cloudflare in the privacy line", () => {
    expect(contactFormContent.privacy).toContain("Cloudflare Turnstile");
  });
});
