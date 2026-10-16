import { describe, expect, it } from "vitest";
import { buildCsp, cspParts, SECURITY_HEADERS } from "../src/security-headers.ts";

describe("SECURITY_HEADERS", () => {
  it("is exactly the static header set from design §5.1, with lower-case names", () => {
    expect(SECURITY_HEADERS).toEqual({
      "strict-transport-security": "max-age=63072000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "DENY",
      "cross-origin-opener-policy": "same-origin",
      "permissions-policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    });
  });

  it("does not send the deprecated X-XSS-Protection header", () => {
    expect(Object.keys(SECURITY_HEADERS)).not.toContain("x-xss-protection");
  });
});

describe("buildCsp", () => {
  it("allows only same-origin scripts when there are no inline script hashes", () => {
    expect(buildCsp([])).toBe(
      "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; " +
        "img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; " +
        "base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; " +
        "upgrade-insecure-requests",
    );
  });

  it("adds each hash as a quoted script-src source, in order", () => {
    expect(buildCsp(["sha256-a", "sha256-b"])).toBe(
      "default-src 'none'; script-src 'self' 'sha256-a' 'sha256-b'; style-src 'self'; " +
        "style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; " +
        "manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; " +
        "object-src 'none'; upgrade-insecure-requests",
    );
  });

  it("never allows unsafe-inline or unsafe-eval scripts", () => {
    const scriptSrc = buildCsp(["sha256-a"])
      .split("; ")
      .find((directive) => directive.startsWith("script-src "));
    expect(scriptSrc).toBe("script-src 'self' 'sha256-a'");
  });
});

describe("cspParts", () => {
  it("splits the policy where the edge function inserts hash sources", () => {
    const { prefix, suffix } = cspParts();
    expect(prefix + " 'sha256-a' 'sha256-b'" + suffix).toBe(buildCsp(["sha256-a", "sha256-b"]));
    expect(prefix + suffix).toBe(buildCsp([]));
  });
});
