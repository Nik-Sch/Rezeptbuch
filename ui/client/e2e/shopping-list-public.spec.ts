import { test, expect } from './test';
import { SEED_LIST_KEY, SEED_LIST_NAME } from './fixtures';

// Public shared route — no authentication.
test.use({ storageState: { cookies: [], origins: [] } });

const listPath = `/shoppingLists/${SEED_LIST_KEY}/${encodeURIComponent(SEED_LIST_NAME)}`;

test.describe('public shopping list', () => {
  test('renders shared items without login', async ({ page }) => {
    await page.goto(listPath);
    await expect(page.getByText('Milk')).toBeVisible();
    await expect(page.getByText('Eggs')).toBeVisible();
  });

  test('visual: public shopping list', async ({ page }) => {
    await page.goto(listPath);
    await expect(page.getByText('Milk')).toBeVisible();
    await expect(page).toHaveScreenshot('shopping-list-public.png');
  });
});
