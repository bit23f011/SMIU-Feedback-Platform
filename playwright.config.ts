import { defineConfig, devices } from "@playwright/test";

/*
  Playwright e2e skeleton (Phase 6). Abhi sirf public smoke: home load hota hai aur
  /admin bina login ke reach nahi hota (route guard). Yeh security ka substitute
  NAHI - asli authority DB (RLS + is_admin() RPC) me hai; yeh sirf outer behaviour
  verify karta hai. Owner ne app build+start karni hai phir `npm run test:e2e`.
*/

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Local run me ye khud app start kar lega. CI par pehle se chal raha ho to reuse.
  webServer: {
    command: "npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
