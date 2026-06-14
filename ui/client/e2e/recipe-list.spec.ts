import { test, expect } from './test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('recipe list', () => {
  test('renders the seeded recipes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page.getByText('E2E Tomato Soup')).toBeVisible();
  });

  test('search filters the list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();

    await page.locator('.search-recipe input').fill('Tomato');

    await expect(page.getByText('E2E Tomato Soup')).toBeVisible();
    await expect(page.getByText('E2E Chocolate Cake')).toHaveCount(0);
  });

  test('visual: recipe list', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page).toHaveScreenshot('recipe-list.png', {
      mask: [page.locator('.recipe-date')], // creation dates vary per seed run
    });
  });
});
