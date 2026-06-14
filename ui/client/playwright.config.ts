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
      // Screenshots capture the fixed viewport (not fullPage), so dimensions are
      // always constant. A small tolerance absorbs sub-pixel/antialiasing noise
      // between the locally-prebuilt and CI-freshly-built backend while still
      // flagging real layout/style regressions from a dependency upgrade.
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  // The app switches to its mobile layout when width or height <= 700px, so the
  // two projects exercise the desktop (SideMenu) and mobile (MobileHeader) UIs.
  // mobile.spec.ts covers the mobile layout; the rest target desktop.
  projects: [
    // Viewport heights are tall enough to contain the full page content (<=960px),
    // so non-fullPage screenshots capture everything at a fixed, deterministic size.
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1100 } },
    },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 1100 } },
    },
  ],
});
