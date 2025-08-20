# Bun + TypeScript API Starter (Hono + Drizzle)

A batteries-included starter for building an API with **Bun**, **TypeScript**, **Hono**, and **Drizzle ORM**.  
It includes: multi-database support (Postgres/MySQL/SQLite) with migrations, unit + functional tests,
OpenAPI generation, Swagger UI, TypeDoc, and a top-tier GitHub toolchain (Actions, Codecov, Renovate, Biome, Dependabot, GitHub Pages).

## Quickstart

```bash
bun install
cp .env.example .env
# choose a DB (sqlite by default)
bun db:generate     # generate SQL from schema
bun db:migrate      # run migrations
bun dev             # start the API on http://localhost:3000
```

OpenAPI: http://localhost:3000/openapi.json  
Docs (Swagger UI): http://localhost:3000/docs

### Scripts
- `bun dev` — run in watch mode
- `bun start` — production start
- `bun test` — run all tests with coverage
- `bun lint` — Biome lint/format check
- `bun fmt` — format files with Biome
- `bun db:generate` — generate migrations via drizzle-kit
- `bun db:migrate` — apply migrations
- `bun openapi` — regenerate OpenAPI JSON
- `bun docs` — build TypeDoc to `site/typedoc`

### Multi-DB
Set `DRIZZLE_DB` to `postgres` | `mysql` | `sqlite` and provide `DATABASE_URL` accordingly.
SQLite works out-of-the-box (`DATABASE_URL=file:./dev.sqlite`).

### GitHub Pages (Docs)
The `pages.yml` workflow builds and deploys:
- `/openapi.json` -> `/site/api/openapi.json`
- Swagger UI -> `/site/api/`
- TypeDoc -> `/site/typedoc/`
A small `site/index.html` links to both.

Enable Pages in **Settings → Pages** (source: GitHub Actions).

## License
MIT
