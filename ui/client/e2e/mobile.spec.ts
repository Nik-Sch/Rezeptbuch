import { test, expect } from './test';
import { AUTH_FILE, SEED_LIST_KEY, SEED_LIST_NAME } from './fixtures';

// Runs under the `mobile` Playwright project (390x844), exercising the mobile
// layout (MobileHeader + drawer) rather than the desktop SideMenu.

test.describe('mobile - public', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-login.png');
  });

  test('public shopping list renders', async ({ page }) => {
    await page.goto(`/shoppingLists/${SEED_LIST_KEY}/${encodeURIComponent(SEED_LIST_NAME)}`);
    await expect(page.getByText('Milk')).toBeVisible();
    await expect(page.getByText('Eggs')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-shopping-list-public.png');
  });
});

test.describe('mobile - authed', () => {
  test.use({ storageState: AUTH_FILE });

  test('recipe list renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page.getByText('E2E Tomato Soup')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-recipe-list.png', {
      mask: [page.locator('.recipe-date')],
    });
  });

  test('opens a recipe from the list', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E Chocolate Cake').click();
    await expect(page).toHaveURL(/\/recipes\/\d+$/);
    await expect(page.getByText('200g flour')).toBeVisible();
    await expect(page).toHaveScreenshot('mobile-recipe-detail.png', {
      mask: [page.locator('.recipe-date')],
    });
  });

  test('menu drawer opens and dark-mode toggle works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/dark/);

    await page.locator('.mobile-header-content .left-align').click(); // hamburger
    await page.locator('.mobile-header-menu .settings label').first().click(); // DarkModeSwitch
    await expect(page.locator('body')).toHaveClass(/dark/);

    await expect(page).toHaveScreenshot('mobile-menu-dark.png', {
      mask: [page.locator('.recipe-date')],
    });
  });
});
