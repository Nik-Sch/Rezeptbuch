import type { Locator, Page } from '@playwright/test';
import { test, expect } from './test';
import {
  AUTH_FILE,
  IMAGED_RECIPE_TITLE,
  addComment,
  createRecipe,
  deleteComment,
  deleteRecipe,
  getRecipeByTitle,
  getSeedCategoryId,
} from './fixtures';

/**
 * Opens every Blueprint popover in the app and asserts content + a screenshot,
 * and exercises the confirm buttons. This is the safety net for the
 * Popover -> PopoverNext migration: baselines are generated on the current
 * (old Popover) code, so any diff after the migration is a direct readout of
 * its visual effect.
 *
 * Non-deterministic regions are masked: recipe dates (`.recipe-date`), comment
 * relative-time dates (`.comment .date`) and autocomplete recipe-id labels
 * (`.bp6-menu-item-label`).
 */
test.use({ storageState: AUTH_FILE });

const NO_IMAGE_RECIPE = 'E2E Tomato Soup'; // a seeded recipe without image/comment

// Opens a recipe and enters edit mode, waiting at each step so interactions don't
// race the async recipe load / edit-mode render. In view mode the description is a
// span and clicking the image opens a fullscreen dialog (not the edit popover), so
// the edit-mode gate matters.
// Screenshots just the open Blueprint popover element (content + arrow). A full-page
// shot is unreliable here: headless Chromium renders the portaled popover at the
// origin (top-left) in the capture even though it's correctly positioned in the live
// DOM (and in real browsers) — so we clip to the popover box, which is position-
// independent. Placement is asserted separately / verified manually.
async function popoverScreenshot(page: Page, name: string, mask: Locator[] = []) {
  const popover = page.locator('.bp6-popover').last();
  await expect(popover).toBeVisible();
  await expect(popover).toHaveScreenshot(name, { mask });
}

async function openRecipeInEditMode(page: Page, title: string, loadedText: string) {
  await page.goto('/');
  await page.getByText(title).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await expect(page.getByText(loadedText, { exact: false })).toBeVisible();
  // The recipe view re-renders on the SSE/recipes subscription, which can swallow
  // the first click; retry until edit mode (the Cancel Editing button) is active.
  await expect(async () => {
    await page.getByRole('button', { name: 'Edit recipe' }).click();
    await expect(page.getByRole('button', { name: 'Cancel Editing' })).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
}

test.describe('popovers (desktop)', () => {
  // Site 1 — ShoppingList create popover (open-only: confirming creates a
  // persistent user list with no clean delete path).
  test('visual: shopping-list create popover', async ({ page }) => {
    await page.goto('/shoppingList');
    await page.locator('.bp6-button:has(.bp6-icon-add)').first().click();
    await expect(page.getByPlaceholder('Shopping List Name...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    await popoverScreenshot(page, 'popover-shopping-list-create.png', [
      page.locator('.recipe-date'),
    ]);
  });

  // Site 2 — comment delete-confirm popover (adds its own comment, confirms it).
  test('comment delete popover + confirm', async ({ page }) => {
    const recipe = await getRecipeByTitle(page.request, IMAGED_RECIPE_TITLE);
    expect(recipe, 'seeded recipe present').toBeTruthy();
    const text = 'E2E delete-me comment';
    const commentId = await addComment(page.request, recipe!.id, text);
    try {
      await page.goto('/');
      await page.getByText(IMAGED_RECIPE_TITLE).click();
      await expect(page).toHaveURL(/\/recipes\/\d+$/);

      const comment = page.locator('.comment').filter({ hasText: text });
      await comment.hover();
      await comment.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.getByText('Confirm deletion')).toBeVisible();
      await popoverScreenshot(page, 'popover-comment-delete.png', [
        page.locator('.recipe-date'),
        page.locator('.comment .date'),
      ]);

      // Confirm.
      await page.locator('.bp6-popover').getByRole('button', { name: 'Delete Comment' }).click();
      await expect(page.getByText(text)).toHaveCount(0);
    } finally {
      await deleteComment(page.request, commentId);
    }
  });

  // Site 4 — description autocomplete popover (open-only; never saved).
  test('visual: description autocomplete popover', async ({ page }) => {
    await openRecipeInEditMode(page, NO_IMAGE_RECIPE, 'Sauté the onion');

    const description = page.locator('.description textarea').first();
    await expect(description).toBeVisible();
    await description.fill((await description.inputValue()) + '#'); // '#' opens the recipe autocomplete

    await expect(page.locator('.description-select-popover')).toBeVisible();
    await popoverScreenshot(page, 'popover-description-autocomplete.png', [
      page.locator('.recipe-date'),
      page.locator('.bp6-menu-item-label'),
    ]);
  });

  // Site 5 — ImagePart edit popover (open-only; the seeded recipe carries the image).
  test('visual: image edit popover', async ({ page }) => {
    await openRecipeInEditMode(page, IMAGED_RECIPE_TITLE, '200g flour');

    // In edit mode the image is the popover target; clicking it opens the edit popover.
    await page.locator('img[src*="/api/images/"], img[srcset*="/api/images/"]').first().click();
    await expect(page.getByText('Edit the image')).toBeVisible();
    await popoverScreenshot(page, 'popover-image-edit.png', [
      page.locator('.recipe-date'),
      page.locator('.comment .date'),
    ]);
  });

  // Site 6 — Recipe cancel/discard-confirm popover (dirty the recipe so the
  // popover appears, screenshot, then confirm discard — non-destructive to data).
  test('cancel-edit popover + confirm discard', async ({ page }) => {
    await openRecipeInEditMode(page, NO_IMAGE_RECIPE, 'Sauté the onion');

    // Dirty the recipe and open the cancel-confirm popover as one retried unit: an
    // SSE-driven re-render can transiently drop edit mode between steps, so re-enter
    // it if needed before each attempt.
    await expect(async () => {
      if (!(await page.getByRole('button', { name: 'Cancel Editing' }).isVisible())) {
        await page.getByRole('button', { name: 'Edit recipe' }).click();
      }
      const description = page.locator('.description textarea').first();
      await expect(description).toBeVisible({ timeout: 2000 });
      const base = (await description.inputValue()).replace(/ \(editing\)$/, '');
      await description.fill(base + ' (editing)'); // make it dirty
      await page.getByRole('button', { name: 'Cancel Editing' }).click({ timeout: 2000 });
      await expect(page.getByText('Confirm cancelation')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 25000 });

    await popoverScreenshot(page, 'popover-cancel-edit.png', [page.locator('.recipe-date')]);

    await page.locator('.bp6-popover').getByRole('button', { name: 'Discard Changes' }).click();
    await expect(page.getByRole('button', { name: 'Edit recipe' })).toBeVisible();
  });

  // Site 7 — Recipe delete-confirm popover (throwaway recipe, confirms delete).
  test('recipe delete popover + confirm', async ({ page }) => {
    const categoryId = await getSeedCategoryId(page.request);
    const id = await createRecipe(page.request, {
      title: 'E2E Throwaway Delete',
      categoryId,
      ingredients: '1 thing',
      description: 'throwaway',
    });
    try {
      await page.goto(`/recipes/${id}`);
      await expect(page.getByRole('button', { name: 'Edit recipe' })).toBeVisible();

      await page.getByRole('button', { name: 'Delete recipe' }).click();
      await expect(page.getByText('Confirm deletion')).toBeVisible();
      await popoverScreenshot(page, 'popover-recipe-delete.png', [page.locator('.recipe-date')]);

      // Confirm — deletes the recipe and redirects to the list.
      await page.locator('.bp6-popover').getByRole('button', { name: 'Delete recipe' }).click();
      await expect(page).toHaveURL(/\/$/);
    } finally {
      await deleteRecipe(page.request, id); // no-op if already deleted by the confirm
    }
  });
});
