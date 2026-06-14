import { chromium, request, FullConfig } from '@playwright/test';
import {
  AUTH_FILE,
  BASE_URL,
  TEST_USER,
  TEST_PASSWORD,
  basicAuthHeader,
  seedData,
} from './fixtures';

/**
 * Runs once before the suite:
 *  1. Registers the deterministic test user (idempotent).
 *  2. Logs in and seeds the user's recipes + public shopping list.
 *  3. Captures an authenticated browser state (session cookie + the `userInfo`
 *     localStorage entry the app uses to bootstrap auth) into AUTH_FILE, so
 *     authenticated specs can skip the login UI.
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = BASE_URL;
  const auth = basicAuthHeader();

  // 1 + 2: register, login and seed via a plain API context.
  const api = await request.newContext({ baseURL });
  await api.post('/api/users', {
    data: { username: TEST_USER, password: TEST_PASSWORD },
  }); // 200 on create, error if exists — either is fine.

  const login = await api.get('/api/login', { headers: { Authorization: auth } });
  if (!login.ok()) {
    throw new Error(`E2E setup: login failed with status ${login.status()}`);
  }
  await seedData(api);
  await api.dispose();

  // 3: capture authenticated browser storage state.
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  // Establish the session cookie inside the browser context's cookie jar.
  await context.request.get('/api/login', { headers: { Authorization: auth } });
  const page = await context.newPage();
  // The PWA shell blocks on registerSW.js + SSE, so 'load'/'domcontentloaded'
  // may never fire; 'commit' resolves once the document is navigated.
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // Seed the localStorage flag the app reads synchronously on first render to
  // avoid a redirect-to-login flash before /api/status resolves.
  await page.evaluate((username) => {
    localStorage.setItem('userInfo', JSON.stringify({ username, write: true }));
  }, TEST_USER);
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
}

export default globalSetup;
