import type { Plugin } from "vite";

const failures: Record<string, { status: number; body: unknown }> = {
  "fail@example.test": { status: 503, body: { error: "unavailable" } },
  "challenge@example.test": { status: 400, body: { error: "challenge" } },
  "fields@example.test": {
    status: 400,
    body: { error: "validation", fields: { email: "invalid" } },
  },
};

/**
 * Answers POST /api/contact under `pnpm run dev` only, so every form state can be reviewed without
 * AWS: these addresses give their failure, and any other succeeds (contact-form design §6).
 */
export function contactApiMock(): Plugin {
  return {
    name: "contact-api-mock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/contact", (req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const { email } = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { email: string };
          const failure = failures[email];
          if (failure) {
            res.statusCode = failure.status;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(failure.body));
            return;
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}
