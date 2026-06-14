import path from 'path';
import { test, expect } from './test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('image upload', () => {
  // Uses the new-recipe page (editable, no image yet) and never saves, so the
  // seeded recipes other tests rely on stay image-less.
  test('uploads an image and renders it from /api/images', async ({ page }) => {
    await page.goto('/recipes/new');

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'upload.png'));

    // On success the recipe image is set and rendered from the API.
    const uploaded = page.locator('img[srcset*="/api/images/"], img[src*="/api/images/"]');
    await expect(uploaded.first()).toBeVisible({ timeout: 15_000 });
  });
});
