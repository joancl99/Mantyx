# Mantyx

**Precisión para tu almacén**

Mantyx is a full-stack inventory and WMS SaaS application built as an enterprise-style portfolio project. It demonstrates multi-tenancy, RBAC, stock control, warehouse locations, movement tracking, inbound/outbound flows, barcode scanning, auditability, realtime alerts, and a clean Angular/Ionic frontend.

## Overview

Mantyx helps companies manage products, stock, movements, warehouses, locations, users, and operational dashboards from a single monorepo. The project is intentionally practical: architecture choices prioritize maintainability, tenant isolation, demonstrable enterprise patterns, and interview-ready features.

## Tech Stack

### Frontend

- **Angular 21** — standalone components, routing, forms, SCSS.
- **Ionic 8.8.7** — app shell, side menu, mobile-friendly UI components.
- **Capacitor 8.3.4** — native mobile runtime for Android and iOS.
- **@capacitor-mlkit/barcode-scanning** — ML Kit barcode/QR scanning on native devices.
- **@zxing/browser** — browser/development barcode scanning fallback.
- **socket.io-client** — realtime low-stock alert integration.

### Backend

- **NestJS 11** — modular TypeScript API.
- **PostgreSQL 16** — relational database.
- **Prisma 6.19.3** — type-safe ORM and migrations.
- **Redis 7** — refresh-token storage and JWT invalidation/blacklist behavior.
- **Socket.io** — realtime low-stock alerts gateway.
- **Swagger / OpenAPI** — API docs at `/api/docs`.

### Tooling

- **Nx 22.7.x** — monorepo build/test/lint orchestration.
- **Docker Compose** — local PostgreSQL and Redis services.
- **Jest / Vitest** — backend and frontend unit testing setup.
- **ESLint / Prettier** — linting and formatting.

## Product Areas

### Implemented Backend Modules

- Auth: login, refresh, logout, JWT guards, RBAC, throttling (no public registration — onboarding is invite-based). Hardened: access-token `jti` denylist on logout, httpOnly refresh cookie keyed per device session, per-account login lockout, and live user re-validation on every request.
- Companies: platform-level company management for `SUPERADMIN`.
- Users: tenant user management.
- Categories and brands: tenant-scoped catalog setup.
- Products: CRUD, search (name/SKU/barcode), filters, pagination, soft delete.
- Stock and movements: inbound, outbound, transfer, adjustment, return, movement history, atomic source-location stock guards (no negative stock under concurrency), and warehouse/company location validation. Role-gated creation (VIEWER is read-only). Overview pagination and low-stock filtering run in SQL.
- Warehouses: warehouses, zones, aisles, and locations.
- Inventory counts: list/detail, creation, start, completion, and line add/update/delete.
- Dashboard: KPIs, alerts, and latest movements — low/no-stock counters and the alert list are SQL aggregates.
- Realtime alerts: authenticated low-stock Socket.io gateway — JWT verified at the handshake and alerts emitted only to the owning company's room (tenant-isolated).
- Performance: explicit Postgres indexes on every hot lookup path (movements, stock by location, inventory counts, users, catalog, audit logs).
- Infrastructure: Prisma module, Redis module, global exception filter, Swagger bootstrap.

### Implemented Frontend Areas

- Auth pages: login only (no register — invite-based onboarding). The login shows the Mantyx logo on a white brand plate; the access token is kept in memory and the session is restored on load via a silent refresh.
- Authenticated Ionic shell with side menu (Mantyx wordmark in the header) and global scanner FAB.
- Dashboard.
- Products.
- Stock (overview with search and paginated list).
- Movements.
- Warehouses drill-down (warehouses → zones → aisles → locations).
- Management — operational command center with stock health, replenishment risk, recent movements, and quick actions.
- Administration:
  - `SUPERADMIN`: global company management.
  - `ADMIN`: tenant users, categories, and brands.
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete actions, and completed read-only state.
- **Receptions**: full INBOUND flow — warehouse + cascading location (zone → aisle → location), multi-line form, scan-to-fill product. Modal transitions to success state with albarán CSV export.
- **Expeditions**: full OUTBOUND flow — same pattern, source location, backend stock guard. Same modal success state with albarán CSV export.
- Receptions and Expeditions share a single config-driven modal (`core/movement-modal/MovementFormModalComponent`); each page maps the location to `toLocationId`/`fromLocationId` by direction, with green (reception) / red (expedition) theming.
- **Barcode/QR scanner**: platform-aware `ScannerService` — ML Kit on native, ZXing overlay on browser. Integrated in the FAB, the shared movement modal, and the inventory line form (scan-to-fill location).
- **CSV export**: `CsvExportService` with BOM prefix (Excel-compatible), RFC-4180 escaping, and timestamped filename. Export button in every list page (Stock, Movements, Receptions, Expeditions) using active filters.
- **Product images**: upload via `PATCH /products/:id/image` (Multer, jpg/png/webp ≤5 MB). Stored on disk, served as static assets. Image picker with live preview in the product form modal.
- **Realtime low-stock alerts**: `SocketService` connects on login, listens to Socket.io `low-stock` events, and shows a dismissible Ionic warning toast in the shell.
- **Frontend route authorization**: shell routes use role metadata and `roleGuard` to keep restricted pages aligned with the menu permissions.
- **Branding**: brand assets in `apps/web/public/brand/` (full logo, mantis symbol, wordmark). Login shows the full logo and the side menu the wordmark, each on a white plate so the dark wordmark stays legible on the dark theme; the favicon (`favicon.ico` + PNG sizes + apple-touch-icon) is generated from the mantis symbol.

## Multi-Tenancy And Roles

Mantyx is a multi-tenant SaaS. Most business records are scoped by `companyId`.

| Role         | Scope                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| `SUPERADMIN` | Platform owner. Manages companies globally.                            |
| `ADMIN`      | Tenant owner. Manages users, categories, and brands for their company. |
| `MANAGER`    | Operational supervisor.                                                |
| `OPERATOR`   | Warehouse operations.                                                  |
| `VIEWER`     | Read-only.                                                             |

Onboarding is invite-based (no public self-registration):

1. The first `SUPERADMIN` is created manually (Prisma Studio / SQL) with `companyId = null`.
2. The `SUPERADMIN` creates each company together with its initial `ADMIN` in one transactional step (`POST /companies`).
3. Each `ADMIN` provisions their own workers (`MANAGER`/`OPERATOR`/`VIEWER`) from the Administración page.

## Monorepo Structure

```text
Mantyx/
├── apps/
│   ├── api/                         # NestJS backend
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Multi-tenant WMS data model
│   │   └── src/
│   │       ├── app/                 # AppModule and health controller
│   │       ├── auth/                # JWT, refresh tokens, guards, decorators
│   │       ├── brands/              # Tenant brand setup
│   │       ├── categories/          # Tenant category setup
│   │       ├── companies/           # SUPERADMIN company management
│   │       ├── common/              # Global filters and shared backend utilities
│   │       ├── config/              # Environment validation
│   │       ├── dashboard/           # KPIs and alerts
│   │       ├── inventory/           # Inventory counts and count lines
│   │       ├── prisma/              # Prisma module/service
│   │       ├── products/            # Product catalog
│   │       ├── redis/               # Redis module/service
│   │       ├── stock/               # Movements and stock alerts gateway
│   │       ├── users/               # Tenant user management
│   │       └── warehouses/          # Warehouses, zones, aisles, locations
│   ├── api-e2e/                     # Backend e2e project
│   └── web/                         # Angular + Ionic frontend
│       └── src/app/
│           ├── auth/                # Login (invite-based, no register)
│           ├── core/
│           │   ├── models/          # Shared frontend model/DTO interfaces
│           │   ├── scanner/         # ScannerOverlayComponent (ZXing web overlay)
│           │   └── services/        # HTTP services + ScannerService
│           ├── features/
│           │   ├── dashboard/
│           │   ├── expeditions/     # OUTBOUND flow
│           │   ├── inventory/
│           │   ├── management/
│           │   ├── movements/
│           │   ├── products/
│           │   ├── receptions/      # INBOUND flow
│           │   ├── stock/
│           │   └── warehouses/
│           └── shell/               # Authenticated Ionic shell/menu
│       └── public/                  # Static assets (brand/ logos, favicons)
├── docker/
│   └── docker-compose.yml           # Local infrastructure
├── capacitor.config.ts              # Capacitor native config
├── AGENTS.md                        # Agent entrypoint
├── CLAUDE.md                        # Agent operational memory
├── PROJECT_CONTEXT.md               # Human-readable project context
├── nx.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22 or newer.
- pnpm.
- Docker Desktop.

If `pnpm` is not available in your shell, use Corepack:

```bash
corepack enable
corepack pnpm --version
```

On Windows, `corepack enable` can require an Administrator shell because it writes shims under the Node.js installation directory. If enabling Corepack is not possible, use `corepack pnpm ...` directly.

### First Time Or After Big Changes

Use this flow after cloning the repository, after dependency/tooling changes, or after switching from npm to pnpm.

```bash
pnpm install
pnpm run db:generate
pnpm nx build api --configuration=development
pnpm nx build web --configuration=production
```

Do not use `npm install` in this project.

### Configure Environment

Create the API environment file from the example if needed:

```bash
cp apps/api/.env.example apps/api/.env
```

### Start Infrastructure

```bash
pnpm run docker:up
```

This starts local infrastructure declared in `docker/docker-compose.yml`.

### Run Database Migrations

Run migrations only on a fresh database or when the API fails because tables/columns are missing.

Check migration status without changing the database:

```bash
npx dotenv -e apps/api/.env -- prisma migrate status --schema=apps/api/prisma/schema.prisma
```

On Windows PowerShell, prefer the direct Prisma command because Nx-wrapped interactive prompts can hang:

```bash
npx dotenv -e apps/api/.env -- prisma migrate dev --schema=apps/api/prisma/schema.prisma --name init
```

Apply committed migrations to an existing database without creating a new migration:

```bash
npx dotenv -e apps/api/.env -- prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Day-To-Day Startup

Use this flow when the project is already installed and the database already exists.

```bash
pnpm run docker:up
pnpm run db:generate
```

### Start The Applications

Run the API and web app in separate terminals.

Terminal 1:

```bash
pnpm run start:api
```

Terminal 2:

```bash
pnpm run start:web
```

URLs:

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Web: `http://localhost:4200`

### Open Prisma Studio

```bash
pnpm exec prisma studio --schema=apps/api/prisma/schema.prisma
```

## Production Deploy (Docker)

The full stack can be run in production with a single command:

```bash
cp docker/.env.prod.example .env
# edit .env with real secrets (DB password, JWT secrets, CORS origin)
docker compose -f docker-compose.prod.yml up -d --build
```

This builds and starts:

- **postgres** — PostgreSQL 16, data persisted in a named volume.
- **redis** — Redis 7, protected with the password in `.env`.
- **api** — NestJS API (Node 24 Alpine, 3-stage build with a pruned production install). Runs `prisma migrate deploy` automatically on startup, then serves on port 3000.
- **web** — Angular app served by `nginx:stable-alpine-slim` on port 80. Nginx proxies `/api`, `/uploads` (product images), and `/ws` (Socket.io WebSocket) to the API container.

Uploaded product images are stored in a named Docker volume (`uploads_data`) so they persist across container restarts.

## Native Mobile Build (Capacitor)

Capacitor is configured and packages are installed. Build for Android:

```bash
pnpm nx build web --configuration=production
npx cap add android        # first time only — creates android/ directory
npx cap sync               # copies built assets + plugins to native dirs
# open android/ in Android Studio
```

For iOS, run `npx cap add ios` and `npx cap sync` on macOS with Xcode.

Required native permissions after `cap add`:

- **Android** `AndroidManifest.xml`: `<uses-permission android:name="android.permission.CAMERA" />`
- **iOS** `Info.plist`: `NSCameraUsageDescription` key.

## Common Commands

| Command                                   | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `pnpm run start:api`                      | Start the NestJS API in dev/watch mode |
| `pnpm run start:web`                      | Start the Angular web app              |
| `pnpm run build:api`                      | Build the API for production           |
| `pnpm run build:web`                      | Build the web app for production       |
| `pnpm run db:generate`                    | Generate the Prisma client             |
| `pnpm run test`                           | Run tests across configured projects   |
| `pnpm nx test api`                        | Run API unit tests                     |
| `pnpm nx test web`                        | Run Angular/Vitest frontend tests      |
| `pnpm nx e2e api-e2e`                     | Run API e2e health check in-process    |
| `pnpm run lint`                           | Run lint across configured projects    |
| `pnpm run docker:up`                      | Start local infrastructure             |
| `pnpm run docker:down`                    | Stop local infrastructure              |
| `pnpm nx format:check --base=origin/main` | Check formatting before merging        |

## Quality Checks

Use these commands to verify the project before committing or opening a PR. This mirrors the current CI quality gate:

```bash
pnpm run db:generate        # generate the Prisma client (needed by api test/build)
pnpm nx format:check --base=origin/main
pnpm nx run api:eslint:lint
pnpm nx lint web
pnpm nx run api-e2e:eslint:lint
pnpm nx test api
pnpm nx test web
pnpm nx build api
pnpm nx build web
pnpm nx e2e api-e2e
```

Current test baseline:

- API unit suite: 65 tests across 10 suites — inventory, products, stock, dashboard, warehouses, plus auth/security (logout denylist, login lockout, per-session refresh, JWT strategy, CompanyGuard 403, upload magic bytes, WS gateway handshake auth + tenant rooms). Specs use `jest-mock-extended` with zero `any`.
- Frontend unit suite: 10 tests — route smoke behavior, `roleGuard`, the shared `MovementFormModalComponent` data loading + submit validation, and the shared in-flight auth refresh.
- API e2e runs a deterministic in-process Nest app for `/api/health`; it does not require `api:serve` or a fixed port.
- Lint is clean: both `api` and `web` are warning-free (no `no-non-null-assertion` warnings).

## Development Rules

- Use `pnpm` for installs and dependency restoration.
- Use Prisma 6. Do not upgrade to Prisma 7 without a migration plan.
- Use Nx for build, test, lint, e2e, and affected workflows.
- Prefer `pnpm nx ...` for direct Nx commands.
- Every Angular component must use separate `.ts`, `.html`, and `.scss` files.
- Shared Angular CSS patterns belong in `apps/web/src/styles/_shared.scss`.
- Component SCSS should only contain component-specific styles.
- Use Mantyx consistently in user-facing text and current project documentation.

## API Reference

Swagger is available at `http://localhost:3000/api/docs` when the API is running.

Representative endpoints:

| Area       | Endpoint Examples                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` (no public register — invite-based) |
| Companies  | `GET /api/companies`, `POST /api/companies`, `PATCH /api/companies/:id/toggle-status`                         |
| Users      | Tenant user management under `/api/users`                                                                     |
| Products   | CRUD and search/filter under `/api/products`                                                                  |
| Categories | Tenant category endpoints under `/api/categories`                                                             |
| Brands     | Tenant brand endpoints under `/api/brands`                                                                    |
| Stock      | Movement endpoints under `/api/stock`                                                                         |
| Warehouses | Warehouse, zone, aisle, and location endpoints under `/api/warehouses`                                        |
| Inventory  | Inventory count endpoints under `/api/inventory`                                                              |
| Dashboard  | KPI and alert endpoints under `/api/dashboard`                                                                |

## Roadmap

- [x] Nx monorepo with Angular frontend and NestJS backend.
- [x] Docker Compose local infrastructure.
- [x] JWT auth with refresh-token flow.
- [x] RBAC with global guards.
- [x] Multi-tenant company model.
- [x] SUPERADMIN company management.
- [x] ADMIN tenant management for users, categories, and brands.
- [x] Product catalog.
- [x] Stock movements and movement history.
- [x] Warehouse structure: warehouses, zones, aisles, locations.
- [x] Dashboard KPIs and alerts.
- [x] Angular/Ionic shell and main feature pages.
- [x] Functional inventory count backend module.
- [x] Inventory frontend integration with the count API.
- [x] Frontend component refactor for Inventory, Warehouses, Products, Movements, Admin, and model separation.
- [x] Inventory service unit tests.
- [x] Inventory line uniqueness hardening and migration.
- [x] Stock service unit tests and source-location stock guards.
- [x] Products service unit tests and tenant-scoped catalog ownership guards.
- [x] Warehouses service unit tests for scoping, hierarchy, duplicates, and protected deletes.
- [x] Receptions — full INBOUND WMS flow with location cascade and scan support.
- [x] Expeditions — full OUTBOUND WMS flow with source location and stock guard.
- [x] Barcode/QR scanner — Capacitor ML Kit (native) + ZXing (web fallback).
- [x] Product image upload — Multer diskStorage, image picker with live preview.
- [x] CSV export flows (Stock, Movements, Receptions, Expeditions + albarán modal).
- [x] Realtime low-stock alerts — Socket.io gateway connected to shell with Ionic toast.
- [x] Production Docker images — 3-stage pruned Dockerfile.api (Node 24) + nginx-slim Dockerfile.web + docker-compose.prod.yml (web 0 critical/0 high, api 0 critical/1 high CVEs).
- [x] Frontend route guard and shared movement-modal unit tests.
- [x] API e2e health check that runs in-process without `api:serve`.
- [x] CI quality gate with explicit format, lint, test, build, and e2e steps (plus a `prisma generate` step).
- [x] Security audit fully addressed and a code-quality refactor pass (`@CompanyId()` decorator, unified movement modal, admin state classes + extracted modal components, dead `types` project removed, `api`/`web` lint warning-free).
- [x] Mantyx brand logos in login and side menu + favicon from the mantis symbol.
- [x] Full-project audit pass (2026-06-09): RBAC on stock movements, authenticated WS gateway with per-tenant rooms, RETURN-as-increment fix, atomic stock decrements, single-default throttler, shared in-flight frontend refresh, 13 database indexes, SQL-side overview/dashboard aggregates, OnPush presentational components, and dead schema removed (`users.refreshToken`, `ProductVariant`).
- [ ] **Next session** — Movements page becomes a TRANSFER-only flow: pick product → origin from its stock entries (location + qty) → destination cascade in the same warehouse → quantity capped at the origin stock. The current modal never sends locations and always 400s; movements are for moving stock, never adding/subtracting it (Receptions/Expeditions own that).
- [ ] **Next session** — Auditoría page for ADMIN: `GET /audit` (company-scoped, filtered, paginated), broaden audit writes to login/logout and product/user CRUD, and an audit panel inside Administración. `AuditLog` is write-only today.
- [ ] Expand API e2e coverage beyond health: auth, tenant-scoped products, stock movements, inventory lifecycle.
- [ ] Broaden frontend unit tests: scanner, CSV export, services, products modal, inventory flows.
- [ ] Cypress or Playwright browser e2e coverage for full user journeys.
- [ ] Optional minors: OnPush for smart container pages; socket reconnect with a fresh access token after a server-side disconnect.

## License

MIT
