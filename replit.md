# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/object-storage-web` (`@workspace/object-storage-web`)

Browser-side upload utilities backed by Replit Object Storage (GCS). Exports:
- `useUpload()` — React hook for two-step presigned URL uploads (request URL from API, PUT file directly to GCS)
- `ObjectUploader` — Uppy v5 modal upload component

The API server exposes `POST /api/storage/uploads/request-url` (returns presigned GCS URL) and `GET /api/storage/objects/*` (serves uploaded files). The `image_url` column on `resin_entries` stores the normalized object path served via this endpoint.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/resin-trading` (`@workspace/resin-trading`)

MARUKI plastics resin trading management app (React + Vite, port via `PORT` env var).

**Features:**
- Two active resin categories: オフグレード, 再生 (recycled)
- Spreadsheet-style tables with CRUD, column show/hide, sort, filter, pagination
- Automatic source-demand matching (excludes クローズ entries); match cache invalidated on all mutations
- Excel import (Japanese column headers) and export (visible columns only)
- Soft-delete recycle bin (ゴミ箱)
- PDF catalog print (single A4 page, up to 10 photos in dynamic grid)
- Photo gallery: up to 3 thumbnails shown, +N badge opens modal with all photos + ZIP download
- Object storage for images (presigned URL upload via `@workspace/object-storage-web`)

**Key files:**
- `src/components/ResinTable.tsx` — table, column definitions, `RECYCLED_ONLY_COLUMNS`, `ALL_COLUMNS`, `DEFAULT_VISIBLE`
- `src/components/ResinForm.tsx` — add/edit form (recycled category hides メーカー, shows 由来/色目/RoHS/メッシュ/形状/physicalOther)
- `src/pages/CategoryView.tsx` — main category page (仕入/需要 tabs)
- `src/lib/exportExcel.ts` — Excel export
- `src/lib/catalogPrint.ts` — PDF catalog generation
- `artifacts/api-server/src/routes/importExcel.ts` — Excel import with Japanese column alias mapping
- `artifacts/api-server/src/routes/resinEntries.ts` — CRUD API routes

**DB schema notable fields (`resin_entries` table):**
- `resin_category`: offgrade | recycled (virgin exists but not shown in UI nav)
- `entry_type`: source | demand
- `is_closed`: オープン | クローズ (TEXT, default オープン)
- Recycled-only fields: `origin`, `color_tone`, `rohs`, `mesh`, `physical_other`, `shape`
- `image_urls`: TEXT[] array for multiple photos; `image_url`: TEXT for single (legacy)

**Dev notes:**
- Green theme: `--primary: 152 73% 41%`
- `useDates: false` in orval config — do NOT change
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- DB push: `psql "$DATABASE_URL" -c "ALTER TABLE ..."` (interactive drizzle push gets stuck on staff table constraint)
- Match cache: `invalidateMatchCache()` must be called on ALL mutations including import
- Route ordering: specific routes before parameterized routes in Express
- ppType/peType/psType/absType are TEXT columns (not enums)
- **resinType is now TEXT** (previously pgEnum; migrated via `ALTER TABLE resin_entries ALTER COLUMN resin_type TYPE text;`); Drizzle schema uses `text("resin_type")` — accepts any string including PBT, PC/ABS, PA, OPS, SBC, TPE, etc.
- Packaging enum (JP): 紙袋/フレコン/カートン/鉄箱/ポリ袋
