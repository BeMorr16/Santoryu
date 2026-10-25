/**
 * Post-deploy checks against the live site over real HTTPS, DNS and TLS (R11). Runs in CI after
 * every deploy and locally with `pnpm run test:smoke` (optionally SMOKE_BASE_URL=https://…).
 * Each test name carries the requirement it checks, so a failure names the check (R11.3).
 */
import { createHash } from "node:crypto";
import { resolve4, resolve6 } from "node:dns/promises";
import { readFileSync } from "node:fs";
import { connect, type ConnectionOptions, type TLSSocket } from "node:tls";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { buildCsp, SECURITY_HEADERS } from "../../src/security-headers.ts";

const cdkJson = JSON.parse(readFileSync(new URL("../../cdk.json", import.meta.url), "utf8")) as {
  context: Record<string, string>;
};
const base = new URL(
  process.env.SMOKE_BASE_URL ?? `https://${cdkJson.context["personal-site:domainName"] ?? ""}`,
);
// The checks cover HTTP→HTTPS, TLS and DNS on the default ports, so only an https origin works.
if (base.protocol !== "https:" || base.port !== "" || base.pathname !== "/") {
  throw new Error(`SMOKE_BASE_URL must be an https origin with no port or path, got ${base.href}`);
}
const apex = base.hostname;
const www = `www.${apex}`;
const buildDir = process.env.SMOKE_BUILD_DIR;

const REVALIDATE = "public, max-age=0, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";
const HTML = "text/html; charset=utf-8";

function request(
  path: string,
  options: {
    host?: string;
    scheme?: "http" | "https";
    method?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const { host = apex, scheme = "https", method = "GET", headers = {} } = options;
  return fetch(`${scheme}://${host}${path}`, { method, headers, redirect: "manual" });
}

async function documentAt(path: string) {
  const response = await request(path);
  return new JSDOM(await response.text()).window.document;
}

function inlineScriptHashes(document: Awaited<ReturnType<typeof documentAt>>): string[] {
  return [...document.querySelectorAll("script")]
    .filter((script) => !script.hasAttribute("src"))
    .map(
      (script) =>
        `sha256-${createHash("sha256").update(script.textContent, "utf8").digest("base64")}`,
    );
}

/** Asset paths the live home page preloads, in document order. */
async function homeAssets() {
  const document = await documentAt("/");
  const hrefs = (selector: string) =>
    [...document.querySelectorAll(selector)].map((link) => link.getAttribute("href") ?? "");
  const modules = hrefs('link[rel="modulepreload"]');
  const entry = modules.find((href) => href.includes("/entry.client-"));
  const [firstModule] = modules;
  const [firstStylesheet] = hrefs('link[rel="stylesheet"]');
  if (!entry || !firstModule || !firstStylesheet)
    throw new Error("Live / has no entry, module or stylesheet.");
  return { modules, entry, firstModule, firstStylesheet };
}

async function sitemapLocs(): Promise<string[]> {
  const xml = await (await request("/sitemap.xml")).text();
  const document = new JSDOM(xml, { contentType: "application/xml" }).window.document;
  return [...document.querySelectorAll("loc")].map((loc) => loc.textContent);
}

function tlsConnect(options: ConnectionOptions): Promise<TLSSocket> {
  return new Promise((resolveSocket, reject) => {
    const socket = connect({ host: apex, servername: apex, port: 443, ...options }, () => {
      resolveSocket(socket);
    });
    socket.on("error", reject);
  });
}

function expectSecurityHeaders(response: Response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value);
  }
}

function expectRedirect(response: Response, location: string) {
  expect(response.status).toBe(301);
  expect(response.headers.get("location")).toBe(location);
}

describe("R1 domain, TLS and canonical host", () => {
  it("R1.1: serves a trusted certificate covering the apex and www", async () => {
    const socket = await tlsConnect({});
    try {
      expect(socket.authorized).toBe(true);
      const names = (socket.getPeerCertificate().subjectaltname ?? "").split(", ");
      expect(names).toEqual(expect.arrayContaining([`DNS:${apex}`, `DNS:${www}`]));
    } finally {
      socket.end();
    }
  });

  it("R1.2: refuses a handshake limited to TLS 1.1", async () => {
    // SECLEVEL=0 lets this client offer TLS 1.0/1.1, so a failure is the server's refusal.
    const error = await tlsConnect({
      minVersion: "TLSv1",
      maxVersion: "TLSv1.1",
      ciphers: "DEFAULT@SECLEVEL=0",
    }).then(
      (socket) => {
        socket.end();
        return undefined;
      },
      (reason: unknown) => reason as NodeJS.ErrnoException,
    );
    expect(error, "TLS 1.1 handshake succeeded").toBeDefined();
    // A protocol_version alert or a reset is the server refusing; anything else (DNS, local
    // OpenSSL policy) means the check did not reach a handshake.
    expect(["ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION", "ECONNRESET"]).toContain(error?.code);
  });

  it.each([apex, www])("R1.5: %s resolves over IPv4 and IPv6", async (name) => {
    expect((await resolve4(name)).length).toBeGreaterThan(0);
    expect((await resolve6(name)).length).toBeGreaterThan(0);
  });

  it.each([apex, www])(
    "R1.3: http://%s redirects to https on the same host, keeping path and query",
    async (host) => {
      expectRedirect(
        await request("/design-system?x=1", { host, scheme: "http" }),
        `https://${host}/design-system?x=1`,
      );
    },
  );

  it("R1.4: https://www redirects to the apex, keeping path and query, with security headers", async () => {
    const response = await request("/design-system?x=1&y=2", { host: www });
    expectRedirect(response, `https://${apex}/design-system?x=1&y=2`);
    expectSecurityHeaders(response);
  });
});

describe("R2 URL handling and status codes", () => {
  it.each(["/", "/design-system", "/design-system/tokens", "/design-system/components"])(
    "R2.1/R2.2: %s is 200 HTML for that page",
    async (path) => {
      const response = await request(path);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(HTML);
      const document = new JSDOM(await response.text()).window.document;
      const canonical = [...document.querySelectorAll('link[rel="canonical"]')].map((link) =>
        link.getAttribute("href"),
      );
      expect(canonical).toEqual([`https://${apex}${path}`]);
    },
  );

  it.each([
    ["/design-system/", "/design-system"],
    ["/design-system/tokens/", "/design-system/tokens"],
    ["/design-system/components/", "/design-system/components"],
    ["/design-system/tokens/index.html", "/design-system/tokens"],
    ["/design-system/components/index.html", "/design-system/components"],
    ["/index.html", "/"],
    ["/design-system/index.html", "/design-system"],
  ])("R2.3/R2.4: %s redirects to %s with security headers", async (path, canonical) => {
    const response = await request(path);
    expectRedirect(response, `https://${apex}${canonical}`);
    expectSecurityHeaders(response);
  });

  it.each(["/nope", "/design-system/nope", "/404.html", "/__spa-fallback.html"])(
    "R2.5/R2.8: %s is a 404 with the not-found page",
    async (path) => {
      const response = await request(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toBe(HTML);
      expect(new JSDOM(await response.text()).window.document.title).toMatch(/^Page not found/);
    },
  );

  it("R2.5: a missing asset is a 404", async () => {
    expect((await request("/assets/nope.js")).status).toBe(404);
  });

  it("R2.6: rejects POST with a 4xx", async () => {
    const { status } = await request("/", { method: "POST" });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  it.each(["br", "gzip"])("R2.9: compresses HTML and JS with %s", async (encoding) => {
    const { entry } = await homeAssets();
    for (const path of ["/", entry]) {
      const response = await request(path, { headers: { "accept-encoding": encoding } });
      expect(response.headers.get("content-encoding"), path).toBe(encoding);
    }
  });
});

describe("R3 caching and content types", () => {
  it("R3.1/R3.5: pages and the 404 revalidate and are UTF-8 HTML", async () => {
    for (const path of [
      "/",
      "/design-system",
      "/design-system/tokens",
      "/design-system/components",
      "/nope",
    ]) {
      const response = await request(path);
      expect(response.headers.get("cache-control"), path).toBe(REVALIDATE);
      expect(response.headers.get("content-type"), path).toBe(HTML);
    }
  });

  it("R3.1/R3.5: robots.txt and sitemap.xml revalidate with their content types", async () => {
    const robots = await request("/robots.txt");
    expect(robots.headers.get("cache-control")).toBe(REVALIDATE);
    expect(robots.headers.get("content-type")).toMatch(/^text\/plain/);
    const sitemap = await request("/sitemap.xml");
    expect(sitemap.headers.get("cache-control")).toBe(REVALIDATE);
    expect(sitemap.headers.get("content-type")).toBe("application/xml");
  });

  it("R3.2/R3.5: hashed JS and CSS are immutable for a year with their content types", async () => {
    const { firstModule, firstStylesheet } = await homeAssets();
    const js = await request(firstModule);
    expect(js.status).toBe(200);
    expect(js.headers.get("cache-control")).toBe(IMMUTABLE);
    expect(js.headers.get("content-type")).toBe("text/javascript");
    const css = await request(firstStylesheet);
    expect(css.status).toBe(200);
    expect(css.headers.get("cache-control")).toBe(IMMUTABLE);
    expect(css.headers.get("content-type")).toBe("text/css");
  });
});

describe("R4 security headers", () => {
  it.each(["/", "/design-system", "/nope", "/robots.txt"])(
    "R4.1/R4.4/R4.5: %s has every security header",
    async (path) => {
      expectSecurityHeaders(await request(path));
    },
  );

  it.each(["/", "/design-system", "/nope"])(
    "R4.2: %s exposes no S3 x-amz-meta-* headers",
    async (path) => {
      const response = await request(path);
      expect([...response.headers.keys()].filter((name) => name.startsWith("x-amz-meta-"))).toEqual(
        [],
      );
    },
  );

  it("R4.1/R4.4/R4.5: a hashed asset has every security header", async () => {
    const { entry } = await homeAssets();
    expectSecurityHeaders(await request(entry));
  });

  it("R4.2: every sitemap page and the 404 have the exact CSP, with hashes for every inline script", async () => {
    const paths = [...(await sitemapLocs()).map((loc) => new URL(loc).pathname), "/nope"];
    for (const path of paths) {
      const response = await request(path);
      const csp = response.headers.get("content-security-policy") ?? "";
      const scriptSrc =
        csp.split("; ").find((directive) => directive.startsWith("script-src ")) ?? "";
      const hashes = scriptSrc
        .split(" ")
        .slice(2)
        .map((source) => source.replace(/^'(.*)'$/, "$1"));
      expect(csp, path).toBe(buildCsp(hashes));
      const document = new JSDOM(await response.text()).window.document;
      for (const hash of inlineScriptHashes(document)) {
        expect(hashes, `${path}: inline script ${hash} is not in the CSP`).toContain(hash);
      }
    }
  });

  it("R4.6: HSTS preload readiness, except the preload directive", async () => {
    // Same-host HTTP→HTTPS redirect, HTTPS on www, and HSTS (≥ 1 year, includeSubDomains) on the
    // apex and on HTTPS redirects.
    expectRedirect(await request("/", { scheme: "http" }), `https://${apex}/`);
    for (const response of [await request("/"), await request("/", { host: www })]) {
      const hsts = response.headers.get("strict-transport-security") ?? "";
      expect(Number(/max-age=(\d+)/.exec(hsts)?.[1])).toBeGreaterThanOrEqual(31_536_000);
      expect(hsts).toContain("includeSubDomains");
    }
  });
});

describe("R10 crawl files", () => {
  it("R10.2: robots.txt allows all crawlers and declares the sitemap", async () => {
    const response = await request("/robots.txt");
    expect(await response.text()).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: https://${apex}/sitemap.xml\n`,
    );
  });

  it("R10.1: every sitemap URL is a 200 page", async () => {
    const locs = await sitemapLocs();
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      const url = new URL(loc);
      expect(url.hostname, loc).toBe(apex);
      expect((await request(url.pathname)).status, loc).toBe(200);
    }
  });
});

describe("R11 deploy freshness", () => {
  it.runIf(buildDir)(
    "R11.2: live index.html references the modules of the build just deployed (only with SMOKE_BUILD_DIR)",
    async () => {
      const local = new JSDOM(readFileSync(`${buildDir ?? ""}/index.html`, "utf8")).window.document;
      const localModules = [...local.querySelectorAll('link[rel="modulepreload"]')].map(
        (link) => link.getAttribute("href") ?? "",
      );
      const { modules } = await homeAssets();
      expect(modules).toEqual(localModules);
    },
  );
});
