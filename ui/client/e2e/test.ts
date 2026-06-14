import { test as base, expect } from '@playwright/test';

/**
 * Shared test object. The app is a PWA whose shell loads a blocking
 * `registerSW.js` script plus SSE/long-poll connections, so `load` and even
 * `domcontentloaded` may never fire. We default navigations to `commit` (resolve
 * as soon as the response arrives) and rely on explicit visibility assertions
 * for readiness — the right pattern for a client-rendered SPA.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    page.goto = ((url: string, options) =>
      originalGoto(url, { waitUntil: 'commit', ...options })) as typeof page.goto;
    await use(page);
  },
});

export { expect };
