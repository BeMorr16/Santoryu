import { describe, expect, it } from "vitest";
import { renderViewerResponse } from "../src/edge-functions.ts";
import { buildCsp, SECURITY_HEADERS } from "../src/security-headers.ts";
import { loadHandler } from "../src/edge-runtime.ts";

interface Response {
  statusCode: number;
  headers: Record<string, { value: string }>;
}

const handler = loadHandler(renderViewerResponse());

function run(statusCode: number, headers: Record<string, string> = {}): Response {
  const response: Response = {
    statusCode,
    headers: Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, { value }])),
  };
  return handler({ request: { method: "GET", uri: "/index.html" }, response }) as Response;
}

const hashes = "sha256-AAAA sha256-BBBB";

describe("viewer-response: security headers (R4.1, R4.4, R4.5)", () => {
  it("sets every static security header on a 200", () => {
    const { headers } = run(200);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headers[name], name).toEqual({ value });
    }
  });

  it("overwrites origin-supplied values", () => {
    const { headers } = run(200, {
      "x-frame-options": "SAMEORIGIN",
      "content-security-policy": "default-src *",
    });
    expect(headers["x-frame-options"]).toEqual({ value: "DENY" });
    expect(headers["content-security-policy"]).toEqual({ value: buildCsp([]) });
  });

  it("keeps unrelated headers", () => {
    const { headers } = run(200, { "content-type": "text/html; charset=utf-8", etag: '"abc"' });
    expect(headers["content-type"]).toEqual({ value: "text/html; charset=utf-8" });
    expect(headers.etag).toEqual({ value: '"abc"' });
  });
});

describe("viewer-response: CSP (R4.2)", () => {
  it("adds the page's script hashes from S3 metadata", () => {
    const { headers } = run(200, { "x-amz-meta-csp-script-hashes": hashes });
    expect(headers["content-security-policy"]).toEqual({
      value: buildCsp(["sha256-AAAA", "sha256-BBBB"]),
    });
  });

  it("sends the hash-less policy on a 200 without metadata (assets, robots, sitemap)", () => {
    expect(run(200).headers["content-security-policy"]).toEqual({ value: buildCsp([]) });
  });

  it("leaves CSP absent on a 304 without metadata, so a stored policy is not replaced", () => {
    expect(run(304).headers).not.toHaveProperty("content-security-policy");
  });

  it("leaves an existing CSP untouched on a 304 without metadata", () => {
    const { headers } = run(304, { "content-security-policy": "kept" });
    expect(headers["content-security-policy"]).toEqual({ value: "kept" });
  });

  it("sends the hashed policy on a 304 that has metadata", () => {
    const { headers } = run(304, { "x-amz-meta-csp-script-hashes": hashes });
    expect(headers["content-security-policy"]).toEqual({
      value: buildCsp(["sha256-AAAA", "sha256-BBBB"]),
    });
  });
});

describe("viewer-response: not-found page (R2.5)", () => {
  it("serves an object marked site-status: 404 with a 404 status", () => {
    const response = run(200, {
      "x-amz-meta-site-status": "404",
      "x-amz-meta-csp-script-hashes": hashes,
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-security-policy"]).toEqual({
      value: buildCsp(["sha256-AAAA", "sha256-BBBB"]),
    });
    expect(response.headers["strict-transport-security"]).toEqual({
      value: SECURITY_HEADERS["strict-transport-security"],
    });
  });

  it("keeps a 304 for the not-found object a 304, so the browser reuses its stored 404", () => {
    expect(run(304, { "x-amz-meta-site-status": "404" }).statusCode).toBe(304);
  });

  it("leaves other statuses alone", () => {
    expect(run(200).statusCode).toBe(200);
  });
});

describe("viewer-response: metadata removal", () => {
  it("removes every x-amz-meta-* header", () => {
    const { headers } = run(200, {
      "x-amz-meta-csp-script-hashes": hashes,
      "x-amz-meta-site-status": "404",
      "x-amz-meta-other": "x",
    });
    expect(Object.keys(headers).filter((name) => name.startsWith("x-amz-meta-"))).toEqual([]);
  });
});

describe("renderViewerResponse", () => {
  it("fits the 10 KB CloudFront Functions limit", () => {
    expect(Buffer.byteLength(renderViewerResponse())).toBeLessThanOrEqual(10_240);
  });
});
