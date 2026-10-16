import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["test/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "smoke",
          environment: "node",
          include: ["test/smoke/**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
