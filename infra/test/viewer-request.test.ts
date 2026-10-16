import { describe, expect, it } from "vitest";
import { renderViewerRequest } from "../src/edge-functions.ts";
import { SECURITY_HEADERS } from "../src/security-headers.ts";
import { loadHandler, querystring, type QueryString } from "./edge-harness.ts";

const testConfig = {
  apex: "example.test",
  files: ["/404.html", "/index.html", "/lab/index.html", "/robots.txt", "/sitemap.xml"],
};

interface Request {
  method: string;
  uri: string;
  querystring: QueryString;
  rawQueryString: () => string | undefined;
  headers: Record<string, { value: string }>;
}

interface Response {
  statusCode: number;
  statusDescription: string;
  headers: Record<string, { value: string }>;
}

const handler = loadHandler(renderViewerRequest(testConfig));

/** `query` is the raw query string without the `?`, as `rawQueryString()` returns it. */
function run(uri: string, options: { host?: string; query?: string } = {}) {
  const request: Request = {
    method: "GET",
    uri,
    querystring: querystring(options.query),
    rawQueryString: () => options.query,
    headers: { host: { value: options.host ?? "example.test" } },
  };
  return handler({ request }) as Request | Response;
}

function expectRedirect(result: Request | Response, location: string) {
  expect(result).toMatchObject({ statusCode: 301, statusDescription: "Moved Permanently" });
  const headers = (result as Response).headers;
  expect(headers.location).toEqual({ value: location });
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(headers[name], name).toEqual({ value });
  }
  expect(Object.keys(headers).sort()).toEqual(
    ["location", ...Object.keys(SECURITY_HEADERS)].sort(),
  );
}

function expectRewrite(result: Request | Response, uri: string) {
  expect(result).not.toHaveProperty("statusCode");
  expect((result as Request).uri).toBe(uri);
}

describe("viewer-request: alternate hosts (R1.4)", () => {
  it.each([
    ["www.example.test", "/lab", "a=1", "https://example.test/lab?a=1"],
    ["d123.cloudfront.net", "/", undefined, "https://example.test/"],
    ["WWW.Example.TEST", "/lab/index.html", undefined, "https://example.test/lab/index.html"],
    [
      "www.example.test",
      "/assets/app-1a2b.js",
      undefined,
      "https://example.test/assets/app-1a2b.js",
    ],
  ] as const)("%s%s → %s", (host, uri, query, location) => {
    expectRedirect(run(uri, { host, query }), location);
  });

  it("treats the apex in mixed case as the apex", () => {
    expectRewrite(run("/lab", { host: "Example.TEST" }), "/lab/index.html");
  });
});

describe("viewer-request: canonical paths (R2.3, R2.4)", () => {
  it.each([
    ["/lab/", "https://example.test/lab"],
    ["/lab//", "https://example.test/lab"],
    ["//", "https://example.test/"],
    ["/index.html", "https://example.test/"],
    ["/lab/index.html", "https://example.test/lab"],
    ["/lab//index.html", "https://example.test/lab"],
  ])("%s → %s", (uri, location) => {
    expectRedirect(run(uri), location);
  });
});

describe("viewer-request: query strings on redirects", () => {
  const cases: [string, string | undefined, string][] = [
    ["keeps parameter order", "x=1&y=2", "?x=1&y=2"],
    ["keeps repeated keys in their original positions", "a=1&b=2&a=3", "?a=1&b=2&a=3"],
    ["keeps an empty value", "a=", "?a="],
    ["keeps a bare key", "a", "?a"],
    ["keeps percent-encoded values as received", "q=a%20b&e=%C3%A9", "?q=a%20b&e=%C3%A9"],
    ["adds no ? when there is no query", undefined, ""],
    ["drops a bare ? with nothing after it", "", ""],
  ];

  describe.each([
    ["alternate host", "/lab", "www.example.test", "https://example.test/lab"],
    ["trailing slash", "/lab/", "example.test", "https://example.test/lab"],
    ["index.html", "/index.html", "example.test", "https://example.test/"],
  ])("%s redirect", (_, uri, host, base) => {
    it.each(cases)("%s", (__, query, suffix) => {
      expectRedirect(run(uri, { host, query }), base + suffix);
    });
  });
});

describe("viewer-request: routing (R2.1, R2.2, R2.5, R2.8)", () => {
  it.each([
    ["/", "/index.html"],
    ["/lab", "/lab/index.html"],
    ["/robots.txt", "/robots.txt"],
    ["/sitemap.xml", "/sitemap.xml"],
    ["/404.html", "/404.html"],
    ["/assets/app-1a2b.js", "/assets/app-1a2b.js"],
    ["/assets/missing.js", "/assets/missing.js"],
    ["/assets", "/404.html"],
    ["/nope", "/404.html"],
    ["/lab/nope", "/404.html"],
    ["/404", "/404.html"],
    ["/__spa-fallback.html", "/404.html"],
    ["/nope.txt", "/404.html"],
  ])("%s → %s", (uri, rewritten) => {
    expectRewrite(run(uri), rewritten);
  });

  it("leaves the query string of a rewritten request alone", () => {
    const result = run("/lab", { query: "a=1" }) as Request;
    expect(result.querystring).toEqual({ a: { value: "1" } });
  });
});

describe("renderViewerRequest", () => {
  it("fits the 10 KB CloudFront Functions limit", () => {
    expect(Buffer.byteLength(renderViewerRequest(testConfig))).toBeLessThanOrEqual(10_240);
  });

  it("throws with the measured size when the rendered code is over 10 KB", () => {
    const files = Array.from({ length: 500 }, (_, index) => `/page-${String(index)}/index.html`);
    expect(() => renderViewerRequest({ apex: "example.test", files })).toThrow(
      /viewer-request\.js renders to \d+ bytes, over the 10240-byte/,
    );
  });
});
