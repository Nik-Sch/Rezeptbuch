import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './e2e/fixtures';

/**
 * E2E + visual-regression suite. Runs against the full docker-compose-dev stack
 * (see e2e/README.md). Snapshots are renderer-sensitive: generate baselines from
 * the official Playwright Linux image so they match CI (documented in the README).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Shared backend data + SSE streams make parallel runs racy; keep it serial.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['github'], ['list']] : [['html'], ['list']],
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      // Baselines are generated in the same Playwright Linux image CI uses, with
      // software rendering, so output is deterministic. Keep a small tolerance
      // for incidental antialiasing noise while still flagging layout/style
      // shifts from a dependency upgrade.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 }, // desktop layout (useMobile = false)
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
