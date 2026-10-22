import { defineConfig } from "@playwright/test";

/**
 * Real-browser tests of the capture extension: the e2e build (`wxt build --mode e2e`) is loaded
 * unpacked into Chromium next to the production web app (`pnpm build` first). Hostile pages are
 * served by Playwright request routing, so no extra port is opened. PORT defaults to 5290;
 * PW_CHROMIUM_PATH selects an installed Chromium instead of Playwright's own.
 */
const port = Number(process.env.PORT ?? 5290);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `node scripts/next.mjs start -p ${port}`,
    cwd: "../web",
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
