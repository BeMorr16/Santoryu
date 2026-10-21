import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Plugin } from "vite";
import { resolveStaticPath } from "./scripts/static-routing.ts";

/** Makes `vite preview` route like the static host, so visual review sees each page's own HTML. */
function previewLikeStaticHost(): Plugin {
  return {
    name: "preview-like-static-host",
    configurePreviewServer(server) {
      const client = server.config.environments.client;
      if (!client) throw new Error("vite preview: no client environment to serve.");
      const clientDir = resolve(server.config.root, client.build.outDir);
      const isFile = (path: string) =>
        statSync(join(clientDir, path), { throwIfNoEntry: false })?.isFile() ?? false;
      server.middlewares.use((req, res, next) => {
        // React Router prerenders through a preview server; leave those requests alone.
        if (process.env.IS_RR_BUILD_REQUEST === "yes") {
          next();
          return;
        }
        const { pathname } = new URL(req.url ?? "/", "http://localhost");
        const target = resolveStaticPath(decodeURIComponent(pathname), isFile);
        if (target.status === 404) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(readFileSync(join(clientDir, target.path)));
          return;
        }
        req.url = target.path;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [reactRouter(), previewLikeStaticHost()],
  // Resolves the `@/components/*` alias from web/tsconfig.json (ds-components design §11).
  resolve: { tsconfigPaths: true },
  // The CSP (img-src 'self', font-src 'self') blocks data: URIs, so never inline an asset (refinement R18.8).
  build: { assetsInlineLimit: 0 },
});
