import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const clientDir = fileURLToPath(new URL("../../build/client/", import.meta.url));

/** The JS a page loads up front: its module scripts' imports and its modulepreloads. */
export function scriptsOf(path: string): string {
  const html = readFileSync(
    `${clientDir}${path === "/" ? "" : `${path.slice(1)}/`}index.html`,
    "utf8",
  );
  const files = new Set(html.match(/\/assets\/[\w.-]+\.js/g) ?? []);
  return [...files].map((file) => readFileSync(`${clientDir}${file.slice(1)}`, "utf8")).join("\n");
}

/** A sentence as it appears in minified JS: up to its first quote or backslash. */
export function fingerprint(sentence: string): string {
  const text = sentence.split(/["'`\\]/)[0] ?? "";
  if (text.length < 20) throw new Error(`too short to fingerprint: ${sentence}`);
  return text;
}
