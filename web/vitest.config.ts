import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "test/*.test.tsx"],
          setupFiles: ["./test/setup-dom.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "test/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "build",
          environment: "node",
          include: ["test/build/**/*.test.ts"],
        },
      },
    ],
  },
});
