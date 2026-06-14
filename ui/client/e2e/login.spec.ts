import { test, expect } from './test';
import { TEST_USER, TEST_PASSWORD } from './fixtures';

// Always start unauthenticated for these tests.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('login page', () => {
  test('logs in with valid credentials and reaches the recipe list', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#username').fill(TEST_USER);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
  });

  test('switching to register reveals the confirm-password field', async ({ page }) => {
    // Guards the react-transition-group CSSTransition that React 19 affects
    // (findDOMNode removal): the password-repeat field animates in here.
    await page.goto('/login');
    await expect(page.locator('#password2')).toHaveCount(0);

    await page.locator('.toggle-button').click();

    await expect(page.locator('#password2')).toBeVisible();
  });

  test('visual: login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page).toHaveScreenshot('login-page.png', { fullPage: true });
  });
});
