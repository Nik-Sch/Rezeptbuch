# End-to-end / visual regression tests

[Playwright](https://playwright.dev) tests that drive the real app through its
critical flows (login, recipe list/detail, public shopping list, dark mode,
language switch) and assert on behaviour **and** full-page screenshots. They were
introduced as a safety net for the React 18 → 19 + Blueprint dependency upgrade.
Covered flows: login, recipe list + search, recipe detail, public shopping list,
image upload, dark-mode toggle and language switch — on both desktop and mobile.

## How it runs

The suite needs three things: the **backend** (api + DB + Redis), the **client**
(served by Vite), and **Playwright** running in a pinned Linux container so
screenshots are byte-for-byte comparable with the committed baselines and CI.

- `e2e/global-setup.ts` registers a deterministic test user, seeds two recipes
  and a public shopping list **via the API**, and saves an authenticated browser
  state to `e2e/.auth/state.json`.
- `e2e/fixtures.ts` holds the seed data + constants. Seeding is idempotent.
- Recipes are scoped per user, so the seeded data is fully deterministic and the
  visual snapshots are stable. Recipe dates (set server-side to "now") are masked
  in screenshots — the magenta block marks the excluded region.
- Two Playwright projects run the suite: **desktop** (1280×800, SideMenu layout)
  for most specs, and **mobile** (390×844, MobileHeader/drawer layout) for
  `mobile.spec.ts`. Each project keeps its own snapshot baselines.

## Running locally

1. Start the full stack and the dev server:

   ```bash
   # from the repo root – brings up db, redis, api, proxy on http://localhost:3040
   docker compose -f docker-compose-dev.yml up -d

   # from ui/client – Vite dev server on http://localhost:5173, /api proxied to :3040
   npm start
   ```

2. Run the suite in the pinned Playwright image (matches CI; needs `--network host`):

   ```bash
   # from ui/client
   docker run --rm --network host -v "$PWD":/work -w /work \
     -e E2E_BASE_URL=http://localhost:5173 \
     mcr.microsoft.com/playwright:v1.60.0-jammy \
     npx playwright test
   ```

   The `npm run test:e2e` / `:ui` / `:update` scripts also exist for running with a
   locally installed browser (`npx playwright install chromium`), but **baselines
   must always be generated in the pinned image** (below) so they match CI.

## Updating snapshots

Screenshots are renderer-sensitive. Always regenerate baselines in the **same
image CI uses**, otherwise they will mismatch on the runner:

```bash
# from ui/client, with the stack + Vite running
docker run --rm --network host -v "$PWD":/work -w /work \
  -e E2E_BASE_URL=http://localhost:5173 \
  mcr.microsoft.com/playwright:v1.60.0-jammy \
  npx playwright test --update-snapshots
# files are written as root; fix ownership:
sudo chown -R "$(id -u):$(id -g)" e2e
```

Review the regenerated PNGs under `e2e/*-snapshots/` before committing — an
intended visual change should be an obvious, reviewable diff.

## CI

The `e2e` job in `.github/workflows/ci.yml` runs on every push/PR. It brings up a
self-contained backend from `ci/docker-compose.ci.yml` (a schema-seeded ephemeral
MariaDB — see `ci/schema.sql` + `ci/seed.sql` — since there is no in-repo schema),
serves the client with Vite, and runs this suite in the pinned Playwright image.
The HTML report is uploaded as a build artifact.
