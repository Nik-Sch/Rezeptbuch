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
      // Baselines are rendered in the pinned Playwright Linux image, but the
      // page content comes from a freshly built backend in CI vs. a prebuilt one
      // locally, which causes ~1px full-page height/sub-pixel rounding diffs
      // (~1% of pixels). Allow 3% so this environmental noise passes while real
      // layout/style regressions from a dependency upgrade (much larger) still fail.
      maxDiffPixelRatio: 0.03,
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
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
});
