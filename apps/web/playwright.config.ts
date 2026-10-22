import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests against the production build (`pnpm build` first): the service
 * worker only registers in production, and offline/reload behaviour is what we need to prove.
 * PORT defaults to 5290. PW_CHROMIUM_PATH lets a machine use an installed Chromium instead of
 * `playwright install chromium`.
 */
const port = Number(process.env.PORT ?? 5290);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    serviceWorkers: "allow",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
      },
    },
  ],
  webServer: {
    command: `node scripts/next.mjs start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
