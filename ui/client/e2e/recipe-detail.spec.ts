import { test, expect } from './test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('recipe detail', () => {
  test('opens a recipe from the list and shows its content', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E Chocolate Cake').click();

    await expect(page).toHaveURL(/\/recipes\/\d+$/);
    await expect(page.getByText('200g flour')).toBeVisible();
    await expect(page.getByText('Mix the dry ingredients', { exact: false })).toBeVisible();
  });

  test('visual: recipe detail', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E Chocolate Cake').click();
    await expect(page).toHaveURL(/\/recipes\/\d+$/);
    await expect(page.getByText('200g flour')).toBeVisible();
    await expect(page).toHaveScreenshot('recipe-detail.png', {
      mask: [page.locator('.recipe-date'), page.locator('.comment .date')],
    });
  });
});
