/**
 * Edge emulator (design §11.2): serves the web build the way production does, by running the
 * real CloudFront Function code and CSP from infra/, plus the S3 metadata production adds.
 * Dependency-free on purpose; run with `node server.ts`.
 *
 * It serves HTTPS with a throwaway self-signed certificate: the production CSP includes
 * `upgrade-insecure-requests`, and WebKit upgrades same-origin subresources of
 * http://127.0.0.1 to https, which would fail. The CSP is never altered for tests.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { extname, join, sep } from "node:path";
import { renderViewerRequest, renderViewerResponse } from "infra/src/edge-functions.ts";
import { loadHandler } from "infra/src/edge-runtime.ts";
import { clientDir, readManifest } from "./build.ts";

export const host = "127.0.0.1";
export const port = 4173;

type Headers = Record<string, { value: string }>;
interface EdgeRequest {
  method: string;
  uri: string;
  querystring: Record<string, { value: string; multiValue?: { value: string }[] }>;
  rawQueryString: () => string;
  headers: Headers;
}
interface EdgeResponse {
  statusCode: number;
  statusDescription?: string;
  headers: Headers;
}

const manifest = readManifest();
const viewerRequest = loadHandler(
  renderViewerRequest({ apex: `${host}:${String(port)}`, files: manifest.files }),
);
const viewerResponse = loadHandler(renderViewerResponse());

// What S3 serves for each published file (infra/src/publish-groups.ts).
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

function edgeRequest(req: IncomingMessage): EdgeRequest {
  const url = new URL(req.url ?? "/", "http://placeholder");
  const raw = url.search.slice(1);
  const querystring: EdgeRequest["querystring"] = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    const existing = querystring[key];
    if (!existing) querystring[key] = { value };
    else existing.multiValue = [...(existing.multiValue ?? [{ value: existing.value }]), { value }];
  }
  const headers: Headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[name] = { value };
  }
  return {
    method: req.method ?? "GET",
    uri: url.pathname,
    querystring,
    rawQueryString: () => raw,
    headers,
  };
}

/** The origin: the file plus the S3 metadata the deploy sets on it. */
async function origin(uri: string): Promise<{ response: EdgeResponse; body: Buffer }> {
  const path = join(clientDir, decodeURIComponent(uri));
  try {
    // S3 keys are literal; never let an encoded "../" reach outside the build.
    if (!path.startsWith(clientDir.endsWith(sep) ? clientDir : clientDir + sep)) throw new Error();
    const body = await readFile(path);
    const headers: Headers = {
      "content-type": { value: contentTypes[extname(uri)] ?? "application/octet-stream" },
    };
    if (uri.endsWith(".html")) {
      headers["x-amz-meta-csp-script-hashes"] = { value: manifest.scriptHashes.join(" ") };
    }
    if (uri === "/404.html") headers["x-amz-meta-site-status"] = { value: "404" };
    return { response: { statusCode: 200, headers }, body };
  } catch {
    return {
      response: { statusCode: 404, headers: { "content-type": { value: "text/plain" } } },
      body: Buffer.from("Not Found"),
    };
  }
}

function send(res: ServerResponse, response: EdgeResponse, body?: Buffer) {
  for (const [name, { value }] of Object.entries(response.headers)) res.setHeader(name, value);
  res.writeHead(response.statusCode);
  res.end(body);
}

/** A one-day self-signed certificate for 127.0.0.1, made with the openssl CLI and then deleted. */
function throwawayCertificate(): { key: Buffer; cert: Buffer } {
  const dir = mkdtempSync(join(tmpdir(), "e2e-cert-"));
  try {
    const [key, cert] = [join(dir, "key.pem"), join(dir, "cert.pem")];
    execFileSync(
      "openssl",
      ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1"].concat([
        "-keyout",
        key,
        "-out",
        cert,
        "-subj",
        `/CN=${host}`,
      ]),
      { stdio: "ignore" },
    );
    return { key: readFileSync(key), cert: readFileSync(cert) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const server = createServer(throwawayCertificate(), (req, res) => {
  const request = edgeRequest(req);
  const result = viewerRequest({ request }) as EdgeRequest | EdgeResponse;
  // A response from viewer-request (a redirect) goes straight to the viewer, as at the edge.
  if ("statusCode" in result) {
    send(res, result);
    return;
  }
  void origin(result.uri).then(({ response, body }) => {
    send(res, viewerResponse({ request: result, response }) as EdgeResponse, body);
  });
});

server.listen(port, host, () => {
  console.log(`Edge emulator serving web/build/client at https://${host}:${String(port)}`);
});
