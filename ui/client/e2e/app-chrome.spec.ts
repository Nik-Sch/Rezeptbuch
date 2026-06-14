import { test, expect } from './test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('app chrome', () => {
  test('dark-mode toggle adds/removes the dark theme class', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/dark/);

    await page.locator('.settings label').first().click(); // DarkModeSwitch
    await expect(page.locator('body')).toHaveClass(/dark/);

    await page.locator('.settings label').first().click();
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });

  test('language switch updates the persisted language', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();

    await page.locator('.settings .language-select').click();
    await page.getByRole('menuitem', { name: 'Deutsch' }).click();

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('i18nextLng')))
      .toBe('de');
  });

  test('visual: recipe list light and dark', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Chocolate Cake')).toBeVisible();
    await expect(page).toHaveScreenshot('chrome-light.png', {
      fullPage: true,
      mask: [page.locator('.recipe-date')],
    });

    await page.locator('.settings label').first().click();
    await expect(page.locator('body')).toHaveClass(/dark/);
    await expect(page).toHaveScreenshot('chrome-dark.png', {
      fullPage: true,
      mask: [page.locator('.recipe-date')],
    });
  });
});
