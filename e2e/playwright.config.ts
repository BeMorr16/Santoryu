import { defineConfig, devices } from "@playwright/test";

// HTTPS with a self-signed certificate; see server.ts for why.
const baseURL = "https://127.0.0.1:4173";

export default defineConfig({
  testDir: "tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    // A failure on CI keeps its trace in the uploaded report, so CI-only failures can be diagnosed.
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node server.ts",
    url: `${baseURL}/`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
  },
});
