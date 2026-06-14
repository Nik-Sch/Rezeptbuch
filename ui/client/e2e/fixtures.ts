import { APIRequestContext } from '@playwright/test';

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

/** Fixed share key + name for the public shopping-list route. */
export const SEED_LIST_KEY = 'e2e-fixed-listkey-0001';
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

/**
 * Idempotently seeds the test user's category, recipes and public shopping list.
 * Re-running never duplicates data, keeping snapshots deterministic.
 * The passed context must already be authenticated (session cookie present).
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

  // Recipes (create only the ones missing for this user)
  const recipesResp = await api.get('/api/recipes');
  const existingTitles = new Set<string>(
    recipesResp.ok() ? ((await recipesResp.json()).recipes ?? []).map((r: { title: string }) => r.title) : [],
  );
  for (const recipe of SEED_RECIPES) {
    if (existingTitles.has(recipe.title)) continue;
    await api.post('/api/recipes', {
      data: {
        title: recipe.title,
        categoryId: category.id,
        ingredients: recipe.ingredients,
        description: recipe.description,
        image: '',
        date: '',
        id: -1,
        userId: -1,
      },
    });
  }

  // Public shopping list + items (POST acts as upsert)
  await api.post('/api/shoppingLists', { data: { id: SEED_LIST_KEY, name: SEED_LIST_NAME } });
  await api.post(`/api/shoppingLists/${SEED_LIST_KEY}`, { data: SEED_LIST_ITEMS });
}
