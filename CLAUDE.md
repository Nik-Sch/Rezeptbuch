# CLAUDE.md

Compact working notes for this repo (a recipe app: React client + Express SSR + Flask API).

## Layout
- `ui/client` — React + Vite + TypeScript SPA (Blueprint UI). npm.
- `ui/server` — Express server (TS, ESM). Serves the built client and does **meta-tag injection** for SEO on `/recipes/*` and `/shoppingLists/*` (no React SSR). npm.
- `api` — Flask REST API, Poetry, Python ≥3.12. Raw SQL via `pymysql` (no ORM). Sessions/notifications/shopping-lists in Redis.
- `proxy` — nginx; in the full stack it strips `/api/` → api, everything else → `ui`.
- `ci/` — assets for the e2e CI job (schema/seed SQL, standalone compose).

## Environment gotchas (read before building)
- **Node: the login-shell can be outdated.** Always `. ~/.nvm/nvm.sh && nvm use 24` before any npm/build (CI uses Node 24). Running npm under v12 silently rewrites `package-lock.json` to the legacy format.
- **Pyright is a Node tool** — run it under Node 24 too (`nvm use 24 && poetry run pyright`), else it crashes with old-node syntax errors (not real type errors).
- **Docker builds need outbound network** (daemon DNS). If containers can't resolve hosts, `apk add` / `poetry install` fail with `bad address` and you can't rebuild the `ui`/`api` images — ask the user, he can fix it. When network is healthy, `docker compose -f docker-compose-dev.yml up -d --build` rebuilds the whole stack fine (incl. the `ui` image's `apk add chromium`, a leftover that's unused by the Vite build but harmless).
- **Direct-loading `/recipes/<id>` or `/recipes/new` hits the SSR meta-injection route**, which fetches the recipe from the api and 404s if it doesn't exist (so a full-page load of `/recipes/new` 404s). Reach the new-recipe page by client-side navigation. Vite doesn't replicate this, so tests that pass under Vite can still 404 against the real stack — validate against `:3040` when it matters.

## Run the stack
```
docker compose -f docker-compose-dev.yml up -d   # db, redis, api, ui, proxy → http://localhost:3040
```
Needs `db.env`, `api/.env`, `ui/.env` (gitignored; already present locally). MariaDB + Redis required.
The api restores its **DB schema from a private backup repo** (`$BACKUP_REPO`) on first start — there is **no in-repo schema/migrations**.

## Per-project commands
- client: `npm run build` (`tsc && vite build`), `lint`, `format:check`, `start` (Vite :5173, proxies `/api`→:3040).
- server: `npm run build` (`tsc`), `lint`, `format:check`.
- api: `poetry install`; CI gates = `poetry run black --check . && isort --check . && pyright && flake8`. After dep bumps, run `black .`/`isort .` to apply, then `poetry lock`.

## E2E / visual tests (`ui/client/e2e`, see its README)
- Playwright, two projects: **desktop** (1280×1100) and **mobile** (390×1100, `mobile.spec.ts`). The app's mobile layout triggers at width/height ≤700px.
- Run in the **pinned Playwright Linux image** so screenshots match CI:
  ```
  docker run --rm --network host -v "$PWD":/work -w /work \
    -e E2E_BASE_URL=http://localhost:5173 \
    mcr.microsoft.com/playwright:v1.60.0-jammy npx playwright test [--update-snapshots]
  ```
  Files are written as root → `sudo chown -R "$(id -u):$(id -g)" e2e` after.
- `global-setup.ts` registers a test user + seeds recipes/shopping-list **via the API** (idempotent); auth state saved to `e2e/.auth/`.
- **Determinism rules learned the hard way:**
  - Screenshots use a **fixed viewport, not `fullPage`** — `fullPage` height varied by 1px across backends and Playwright hard-fails on any size mismatch.
  - Recipe **dates** are masked (server-set; vary per run) — the magenta block is intentional.
  - Recipe **thumbnails** depend on `category.id` via `categoryImageMap` (ids 1–34); `ci/seed.sql` sets `category` auto-increment to 1000 so seeded recipes always use the generic `noRecipe` image.
  - `maxDiffPixelRatio: 0.03` absorbs sub-pixel noise between the local (prebuilt) and CI (fresh-built) backends, amplified on high-DPR mobile.

## CI (`.github/workflows/ci.yml`)
Jobs: `ui` (client+server lint/build/format), `python-api` (3.12/3.13 lint/type/format), and **`e2e`** — brings up a self-contained backend from `ci/docker-compose.ci.yml` (schema-seeded ephemeral MariaDB via `ci/schema.sql`+`ci/seed.sql`; placeholder `ui` so nginx starts), serves the client with Vite, runs Playwright in the pinned image.

## Conventions
- Branch + PR for changes; **don't merge** — the maintainer approves/merges.
- Dependency upgrades done in waves: React 19 first, then react-router 7 / i18next 26 / TypeScript 6. Two upgrades remain deliberately deferred: **eslint stays 9** (eslint-plugin-react has no eslint-10-compatible release — eslint 10 crashes it via removed `context.getFilename()`), and the **Blueprint `Popover` → `PopoverNext`** migration (not a drop-in: `position`→`placement`, Floating UI vs react-popper; `@typescript-eslint/no-deprecated` is kept at `warn` for these 7 sites).
- TS 6: `moduleResolution: "node"` is deprecated → client uses `bundler`, server uses `nodenext` (relative imports need `.js`, and `outDir` requires explicit `rootDir`).
