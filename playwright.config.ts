import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI
          ? "npm run build && npm run start"
          : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 300_000 : 120_000,
      },
});
