import { join } from "node:path";
import type { Config } from "@react-router/dev/config";
import { finalize404 } from "./scripts/finalize-404.ts";

export default {
  appDirectory: "src",
  ssr: false,
  prerender: ["/", "/lab", "/404"],
  async buildEnd({ reactRouterConfig }) {
    await finalize404(join(reactRouterConfig.buildDirectory, "client"));
  },
} satisfies Config;
