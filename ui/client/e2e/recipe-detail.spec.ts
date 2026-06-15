import { test, expect } from './test';
import { AUTH_FILE, createRecipe, deleteRecipe, getSeedCategoryId } from './fixtures';

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

  // Regression: a long title must wrap cleanly (no ellipsis truncation) and must never
  // crop the Share/Edit/Delete action buttons. Asserted via layout invariants rather
  // than a screenshot: the exact wrap points shift by ~1 line depending on whether a
  // vertical scrollbar is present, but the invariants (nothing clipped, nothing
  // overflowing) hold regardless and are what the fix actually guarantees.
  test('long title wraps cleanly and keeps the action buttons visible', async ({ page }) => {
    const title = 'E2E Gnocchi mit Tofu-Tomaten-Sahne-Soße und extra viel frischem Basilikum';
    const categoryId = await getSeedCategoryId(page.request);
    const id = await createRecipe(page.request, {
      title,
      categoryId,
      ingredients: '1 thing',
      description: 'long-title layout regression',
    });
    try {
      await page.goto(`/recipes/${id}`);
      await expect(page.getByRole('button', { name: 'Edit recipe' })).toBeVisible();

      const layout = await page.evaluate(() => {
        const round = (n: number) => Math.round(n);
        const content = document.querySelector('.title-wrapper > .title .bp6-editable-text-content');
        const editContainer = document.querySelector('.edit-container');
        const recipe = document.querySelector('.recipe');
        return {
          titleText: (content?.textContent ?? '').trim(),
          // truncation would make the rendered (scroll) size exceed the visible (client) size
          clippedX: content ? content.scrollWidth > content.clientWidth + 1 : true,
          clippedY: content ? content.scrollHeight > content.clientHeight + 1 : true,
          // the buttons must not spill past the recipe's right edge
          overflow: editContainer && recipe
            ? round(editContainer.getBoundingClientRect().right - recipe.getBoundingClientRect().right)
            : 999,
        };
      });

      expect(layout.titleText).toBe(title); // full title rendered, nothing dropped
      expect(layout.clippedX, 'title not truncated horizontally').toBe(false);
      expect(layout.clippedY, 'title not truncated vertically').toBe(false);
      expect(layout.overflow, 'action buttons stay within the recipe').toBeLessThanOrEqual(1);
      for (const name of ['Share', 'Edit recipe', 'Delete recipe']) {
        await expect(page.getByRole('button', { name })).toBeVisible();
      }
    } finally {
      await deleteRecipe(page.request, id);
    }
  });
});
