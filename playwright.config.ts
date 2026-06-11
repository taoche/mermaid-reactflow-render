import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1440, height: 1000 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5180",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
