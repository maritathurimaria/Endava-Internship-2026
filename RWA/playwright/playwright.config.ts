import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/config/env";

// The app formats and filters dates in UTC. Running the test process and the
// browser in UTC keeps date-range assertions deterministic on any machine.
process.env.TZ = "UTC";

export default defineConfig({
  testDir: "./tests",
  // Every test re-seeds one shared JSON database, so tests must not overlap.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: "data-test",
    timezoneId: "UTC",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: env.apiURL },
    },
    {
      name: "ui-desktop",
      testDir: "./tests/ui",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
    {
      name: "ui-mobile",
      testDir: "./tests/ui",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: false, // keep desktop Chrome engine, only the viewport changes (mirrors Cypress)
      },
    },
    {
      name: "ui-tablet",
      testDir: "./tests/ui",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 500, height: 800 },
        isMobile: false,
      },
    },
    {
      // Cross-layer user journeys (decision D-006): UI steps + API setup/verification.
      name: "e2e",
      testDir: "./tests/e2e",
      testMatch: /.*\.e2e\.spec\.ts/,
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
  ],
});
