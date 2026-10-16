/* exported handler */
/* global __CONFIG__ */
// CloudFront Functions viewer-request handler (cloudfront-js-2.0). Static-hosting design §4.
// Runtime limits: no modules, spread, destructuring, optional chaining or for...of.
// CONFIG is replaced at synth time with { apex, files, headers } (src/edge-functions.ts).
var CONFIG = __CONFIG__;

// The raw query, not the parsed querystring object, whose key order is not the request's.
function redirect(path, request) {
  const query = request.rawQueryString();
  const headers = {
    location: { value: `https://${CONFIG.apex}${path}${query ? `?${query}` : ""}` },
  };
  Object.keys(CONFIG.headers).forEach((name) => {
    headers[name] = { value: CONFIG.headers[name] };
  });
  return { statusCode: 301, statusDescription: "Moved Permanently", headers: headers };
}

function withoutTrailingSlashes(path) {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function handler(event) {
  const request = event.request;
  const uri = request.uri;
  const host = request.headers.host ? request.headers.host.value.toLowerCase() : "";

  if (host !== CONFIG.apex) {
    return redirect(uri, request);
  }
  if (uri.endsWith("/index.html")) {
    return redirect(withoutTrailingSlashes(uri.slice(0, -"index.html".length)), request);
  }
  if (uri !== "/" && uri.endsWith("/")) {
    return redirect(withoutTrailingSlashes(uri), request);
  }
  if (uri.startsWith("/assets/")) {
    return request;
  }
  if (uri === "/") {
    request.uri = "/index.html";
    return request;
  }

  const lastSegment = uri.slice(uri.lastIndexOf("/") + 1);
  const candidate = lastSegment.includes(".") ? uri : `${uri}/index.html`;
  request.uri = CONFIG.files.includes(candidate) ? candidate : "/404.html";
  return request;
}
