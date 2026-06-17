import { APIRequestContext } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Shared constants and seeding logic for the e2e regression suite.
 *
 * These tests run against the full docker-compose-dev stack (see e2e/README.md).
 * A dedicated, deterministic test user owns all seeded data so visual snapshots
 * are stable across runs (recipes are scoped per-user by the API).
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3040';

export const TEST_USER = 'e2e_test';
export const TEST_PASSWORD = 'e2e_password_123';

/** Persisted authenticated browser state (cookie + localStorage). */
export const AUTH_FILE = 'e2e/.auth/state.json';

export const SEED_CATEGORY = 'E2E Desserts';

export const SEED_RECIPES = [
  {
    title: 'E2E Chocolate Cake',
    ingredients: '200g flour\n100g sugar\n3 eggs',
    description: 'Mix the dry ingredients, fold in the eggs and bake at 180°C.\n\nServe warm.',
  },
  {
    title: 'E2E Tomato Soup',
    ingredients: '500g tomatoes\n1 onion\n1 clove garlic',
    description: 'Sauté the onion, add tomatoes and simmer for 20 minutes.',
  },
];

/**
 * The seeded recipe that carries an image + a comment, so the popover specs can
 * deterministically open the ImagePart edit popover and the comment popovers.
 */
export const IMAGED_RECIPE_TITLE = SEED_RECIPES[0].title;
export const SEED_COMMENT = 'E2E seed comment for popover tests.';

/**
 * Fixed share key + name for the public shopping-list route. The key must be a
 * UUID: the client only ever creates shared lists via uuidv4(), and the API now
 * requires shared-list ids to be UUID-shaped so they can never collide with a
 * private list (keyed by the bare username).
 */
export const SEED_LIST_KEY = '00000000-0000-4000-8000-000000000001';
export const SEED_LIST_NAME = 'E2E Groceries';

export const SEED_LIST_ITEMS = [
  {
    text: 'Milk',
    checked: false,
    addedTime: '2026-01-01T00:00:00.000Z',
    id: 'item-milk-0001',
    position: 0,
  },
  {
    text: 'Eggs',
    checked: false,
    addedTime: '2026-01-01T00:00:00.000Z',
    id: 'item-eggs-0002',
    position: 1,
  },
];

export function basicAuthHeader(user = TEST_USER, password = TEST_PASSWORD): string {
  return 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
}

interface ApiCategory {
  id: number;
  name: string;
}

interface ApiRecipe {
  id: number;
  title: string;
  categoryId: number;
  ingredients: string;
  description: string;
  image: string;
}

interface ApiComment {
  id: number;
  text: string;
  recipeId: number;
}

/** Uploads the shared image fixture; the API dedups by content hash, so this is idempotent. */
async function uploadSeedImage(api: APIRequestContext): Promise<string> {
  const buffer = readFileSync(path.join(__dirname, 'fixtures', 'upload.png'));
  const resp = await api.post('/api/images', {
    multipart: { image: { name: 'upload.png', mimeType: 'image/png', buffer } },
  });
  return (await resp.json()).name as string;
}

/** Find a recipe owned by the current user by title (returns undefined if absent). */
export async function getRecipeByTitle(
  api: APIRequestContext,
  title: string,
): Promise<ApiRecipe | undefined> {
  const resp = await api.get('/api/recipes');
  const recipes: ApiRecipe[] = resp.ok() ? ((await resp.json()).recipes ?? []) : [];
  return recipes.find((r) => r.title === title);
}

/** Create a recipe and return its id (used by specs for throwaway entities). */
export async function createRecipe(
  api: APIRequestContext,
  data: { title: string; categoryId: number; ingredients?: string; description?: string },
): Promise<number> {
  await api.post('/api/recipes', {
    data: {
      title: data.title,
      categoryId: data.categoryId,
      ingredients: data.ingredients ?? '',
      description: data.description ?? '',
      image: '',
      date: '',
      id: -1,
      userId: -1,
    },
  });
  const created = await getRecipeByTitle(api, data.title);
  if (!created) throw new Error(`createRecipe: '${data.title}' not found after POST`);
  return created.id;
}

export async function deleteRecipe(api: APIRequestContext, id: number): Promise<void> {
  await api.delete(`/api/recipes/${id}`);
}

export async function addComment(
  api: APIRequestContext,
  recipeId: number,
  text: string,
): Promise<number> {
  const resp = await api.post('/api/comments', { data: { text, recipeId } });
  return (await resp.json()).id as number;
}

export async function deleteComment(api: APIRequestContext, id: number): Promise<void> {
  await api.delete(`/api/comments/${id}`);
}

/** The id of the seeded category (specs need it to create throwaway recipes). */
export async function getSeedCategoryId(api: APIRequestContext): Promise<number> {
  const resp = await api.get('/api/categories');
  const categories: ApiCategory[] = resp.ok() ? ((await resp.json()).categories ?? []) : [];
  const category = categories.find((c) => c.name === SEED_CATEGORY);
  if (!category) throw new Error(`getSeedCategoryId: '${SEED_CATEGORY}' not found`);
  return category.id;
}

/**
 * Idempotently seeds the test user's category, recipes, a comment + image on the
 * first recipe, and the public shopping list. Re-running never duplicates data,
 * keeping snapshots deterministic. The context must already be authenticated.
 */
export async function seedData(api: APIRequestContext): Promise<void> {
  // Category
  const catResp = await api.get('/api/categories');
  const categories: ApiCategory[] = catResp.ok() ? ((await catResp.json()).categories ?? []) : [];
  let category = categories.find((c) => c.name === SEED_CATEGORY);
  if (!category) {
    const created = await api.post('/api/categories', { data: { name: SEED_CATEGORY } });
    category = { id: (await created.json()).id as number, name: SEED_CATEGORY };
  }

  // One image, shared by the recipe that needs it (dedup'd server-side by hash).
  const imageName = await uploadSeedImage(api);

  // Recipes: create missing ones (IMAGED_RECIPE_TITLE carries the image); if it
  // already exists without an image (older seed), update it so the ImagePart
  // popover has something to edit.
  const existing = new Map<string, ApiRecipe>();
  {
    const resp = await api.get('/api/recipes');
    const recipes: ApiRecipe[] = resp.ok() ? ((await resp.json()).recipes ?? []) : [];
    recipes.forEach((r) => existing.set(r.title, r));
  }
  for (const recipe of SEED_RECIPES) {
    const image = recipe.title === IMAGED_RECIPE_TITLE ? imageName : '';
    const found = existing.get(recipe.title);
    if (!found) {
      await api.post('/api/recipes', {
        data: {
          title: recipe.title,
          categoryId: category.id,
          ingredients: recipe.ingredients,
          description: recipe.description,
          image,
          date: '',
          id: -1,
          userId: -1,
        },
      });
    } else if (image && !found.image) {
      await api.put(`/api/recipes/${found.id}`, {
        data: {
          title: found.title,
          categoryId: found.categoryId,
          ingredients: found.ingredients,
          description: found.description,
          image,
        },
      });
    }
  }

  // One comment on the imaged recipe (idempotent — skip if it already exists).
  const target = await getRecipeByTitle(api, IMAGED_RECIPE_TITLE);
  if (target) {
    const cResp = await api.get('/api/comments');
    const comments: ApiComment[] = cResp.ok() ? ((await cResp.json()).comments ?? []) : [];
    const exists = comments.some((c) => c.recipeId === target.id && c.text === SEED_COMMENT);
    if (!exists) {
      await addComment(api, target.id, SEED_COMMENT);
    }
  }

  // Public shopping list + items (POST acts as upsert)
  await api.post('/api/shoppingLists', { data: { id: SEED_LIST_KEY, name: SEED_LIST_NAME } });
  await api.post(`/api/shoppingLists/${SEED_LIST_KEY}`, { data: SEED_LIST_ITEMS });
}
