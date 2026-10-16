/* exported handler */
/* global __CONFIG__ */
// CloudFront Functions viewer-response handler (cloudfront-js-2.0). Static-hosting design §5.
// Runtime limits: no modules, spread, destructuring, optional chaining or for...of.
// CONFIG is replaced at synth time with { headers, cspPrefix, cspSuffix } (src/edge-functions.ts).
var CONFIG = __CONFIG__;

function scriptSources(hashes) {
  return hashes
    .split(" ")
    .filter((hash) => hash !== "")
    .map((hash) => ` '${hash}'`)
    .join("");
}

function handler(event) {
  const response = event.response;
  const headers = response.headers;
  const hashes = headers["x-amz-meta-csp-script-hashes"];
  const siteStatus = headers["x-amz-meta-site-status"];

  Object.keys(CONFIG.headers).forEach((name) => {
    headers[name] = { value: CONFIG.headers[name] };
  });

  // Browsers update stored headers from a 304, so a 304 without the page's hashes keeps its CSP.
  if (hashes) {
    const value = CONFIG.cspPrefix + scriptSources(hashes.value) + CONFIG.cspSuffix;
    headers["content-security-policy"] = { value: value };
  } else if (response.statusCode !== 304) {
    headers["content-security-policy"] = { value: CONFIG.cspPrefix + CONFIG.cspSuffix };
  }

  // Only a full response becomes a 404; a 304 tells the browser to reuse its stored 404.
  if (siteStatus && siteStatus.value === "404" && response.statusCode === 200) {
    response.statusCode = 404;
  }

  const published = {};
  Object.keys(headers).forEach((name) => {
    if (!name.startsWith("x-amz-meta-")) {
      published[name] = headers[name];
    }
  });
  response.headers = published;
  return response;
}
