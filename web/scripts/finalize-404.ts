import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * React Router prerenders the splat route at /404 as 404/index.html. Hosting serves a root
 * 404.html for unknown paths, so move it there and drop the /404 route's other output.
 */
export async function finalize404(clientDir: string): Promise<void> {
  const source = join(clientDir, "404", "index.html");
  if (!existsSync(source)) {
    throw new Error(`Expected a prerendered not-found page at ${source}. Is "/404" in prerender?`);
  }
  await rename(source, join(clientDir, "404.html"));
  await rm(join(clientDir, "404"), { recursive: true, force: true });
  await rm(join(clientDir, "404.data"), { force: true });
}

/**
 * React Router always emits a client-only __spa-fallback.html. Every route is prerendered and
 * unknown paths get 404.html, so nothing uses it; drop it so it is never published.
 */
export async function removeSpaFallback(clientDir: string): Promise<void> {
  await rm(join(clientDir, "__spa-fallback.html"), { force: true });
}
