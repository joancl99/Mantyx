# Mantyx

**Precisión para tu almacén**

Mantyx is a full-stack inventory and WMS SaaS application built as an enterprise-style portfolio project. It demonstrates multi-tenancy, RBAC, stock control, warehouse locations, movement tracking, auditability, realtime alerts, and a clean Angular/Ionic frontend.

## Overview

Mantyx helps companies manage products, stock, movements, warehouses, locations, users, and operational dashboards from a single monorepo. The project is intentionally practical: architecture choices prioritize maintainability, tenant isolation, demonstrable enterprise patterns, and interview-ready features.

## Tech Stack

### Frontend

- **Angular 21** — standalone components, routing, forms, SCSS.
- **Ionic 8.8.7** — app shell, side menu, mobile-friendly UI components.
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

- Auth: register, login, refresh, logout, JWT guards, RBAC, throttling.
- Companies: platform-level company management for `SUPERADMIN`.
- Users: tenant user management.
- Categories and brands: tenant-scoped catalog setup.
- Products: CRUD, search, filters, pagination, soft delete.
- Stock and movements: inbound, outbound, transfer, adjustment, movement history.
- Warehouses: warehouses, zones, aisles, and locations.
- Inventory counts: list/detail, creation, start, completion, and line add/update/delete.
- Dashboard: KPIs, alerts, and latest movements.
- Realtime alerts: stock alerts gateway.
- Infrastructure: Prisma module, Redis module, global exception filter, Swagger bootstrap.

### Implemented Frontend Areas

- Auth pages: login and register.
- Authenticated Ionic shell with side menu.
- Dashboard.
- Products.
- Stock.
- Movements.
- Warehouses drill-down.
- Administration:
  - `SUPERADMIN`: global company management.
  - `ADMIN`: tenant users, categories, and brands.
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete actions, and completed read-only state.
- Placeholder frontend pages/components currently present but not implemented: Management, Receptions, Expeditions, and Stock Query.

## Multi-Tenancy And Roles

Mantyx is a multi-tenant SaaS. Most business records are scoped by `companyId`.

Roles:

- `SUPERADMIN`: platform owner. Can manage companies globally.
- `ADMIN`: tenant owner. Manages users, categories, and brands for their own company.
- `MANAGER`: operational supervisor.
- `OPERATOR`: warehouse operations user.
- `VIEWER`: read-only user.

Fresh database bootstrap requirement:

1. Create a `Company` in Prisma Studio or with a seed/script.
2. Assign the initial non-SUPERADMIN `User.companyId`.
3. Log in again so the JWT contains the new `companyId`.

## Current Product Focus

Inventory counts are implemented and connected end to end. Current follow-up work is focused on tests, edge-case hardening, and selected operational enhancements.

Implemented inventory API endpoints:

| Method   | Endpoint                           | Description                                                |
| -------- | ---------------------------------- | ---------------------------------------------------------- |
| `GET`    | `/api/inventory`                   | List tenant inventory counts with pagination/status filter |
| `POST`   | `/api/inventory`                   | Create a count for a warehouse                             |
| `GET`    | `/api/inventory/:id`               | Count detail with lines                                    |
| `PATCH`  | `/api/inventory/:id/start`         | Move `DRAFT` to `IN_PROGRESS`                              |
| `PATCH`  | `/api/inventory/:id/complete`      | Calculate differences and mark completed                   |
| `POST`   | `/api/inventory/:id/lines`         | Add a count line                                           |
| `PATCH`  | `/api/inventory/:id/lines/:lineId` | Register counted quantity                                  |
| `DELETE` | `/api/inventory/:id/lines/:lineId` | Remove a line only while `DRAFT`                           |

Frontend refactor status:

- Inventory uses feature-local `data-access`, `models`, filters, list, create modal, and detail components.
- Inventory line location selector state lives in `inventory-line-location-state.ts`.
- Warehouses uses shared `core/models/warehouse.models.ts` and child components for breadcrumb, warehouse list, and sublevel list.
- Products uses shared `core/models/product.models.ts` and child components for filters, list, form modal, and delete modal.
- Products list/filter/pagination/search state lives in `products-list-state.ts`.
- Stock and movements use shared `core/models/stock.models.ts`; stock has a list/pagination child component, and movements has filter, list, and create modal components.
- Dashboard uses shared `core/models/dashboard.models.ts`.
- Admin uses shared `core/models/user.models.ts` and `core/models/company.models.ts`, with child components for companies, users, and catalog sections.
- Auth and socket payload models live in `core/models`, keeping `core/services` HTTP/service focused.
- Shared SCSS patterns live in `apps/web/src/styles/_shared.scss`.
- Management, Receptions, Expeditions, and Stock Query remain placeholder pages.

Remaining frontend refactor work:

- First-pass extraction is complete for the main implemented feature pages.
- Second-pass cleanup should slim large feature containers that still own orchestration state: Movements. Admin catalog orchestration, Warehouses navigation state, Inventory line location state, and Products list state have been extracted; remaining Admin/Warehouses/Inventory/Products modal and detail orchestration can still be revisited later.
- Dashboard still has a large component stylesheet; extract only reusable patterns to `_shared.scss` when another feature needs them.
- Shared activate/deactivate action button variants are centralized in `_shared.scss`.
- Management is a routed placeholder page.
- Receptions, Expeditions, and Stock Query are placeholder components not currently exposed in shell routes.

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
│           ├── auth/                # Login/register
│           ├── core/                # Guards, interceptors, services, shared frontend models
│           ├── features/            # Dashboard, products, stock, movements, etc.
│           └── shell/               # Authenticated Ionic shell/menu
├── libs/
│   └── shared/                      # Shared TypeScript types
├── docker/
│   └── docker-compose.yml           # Local infrastructure
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
pnpm prisma generate --schema=apps/api/prisma/schema.prisma
pnpm nx build api --configuration=development
pnpm nx build web --configuration=production
```

Equivalent Corepack command if `pnpm` is not in `PATH`:

```bash
corepack pnpm install
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

The inventory line uniqueness migration requires no duplicate `(inventoryCountId, locationId)` rows in `inventory_count_lines` before it is applied.

Fresh database bootstrap requirement:

1. Create a `Company` in Prisma Studio or with a seed/script.
2. Assign the initial non-SUPERADMIN `User.companyId`.
3. Log in again so the JWT contains the new `companyId`.

### Day-To-Day Startup

Use this flow when the project is already installed and the database already exists.

```bash
pnpm run docker:up
pnpm prisma generate --schema=apps/api/prisma/schema.prisma
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

## Common Commands

| Command                                                   | Description                            |
| --------------------------------------------------------- | -------------------------------------- |
| `pnpm run start:api`                                      | Start the NestJS API in dev/watch mode |
| `pnpm run start:web`                                      | Start the Angular web app              |
| `pnpm run build:api`                                      | Build the API for production           |
| `pnpm run build:web`                                      | Build the web app for production       |
| `pnpm run test`                                           | Run tests across configured projects   |
| `pnpm nx test api`                                        | Run API unit tests                     |
| `pnpm run lint`                                           | Run lint across configured projects    |
| `pnpm run docker:up`                                      | Start local infrastructure             |
| `pnpm run docker:down`                                    | Stop local infrastructure              |
| `pnpm nx affected -t lint --base=origin/main --head=HEAD` | Run affected lint before merging       |

## Quality Checks

Use these commands to verify the project before committing or opening a PR:

```bash
pnpm nx format:check
pnpm nx run-many -t lint
pnpm nx run-many -t test
pnpm nx build api --configuration=development
pnpm nx build web --configuration=production
```

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

| Area       | Endpoint Examples                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`              |
| Companies  | `GET /api/companies`, `POST /api/companies`, `PATCH /api/companies/:id`, `PATCH /api/companies/:id/toggle-status` |
| Users      | Tenant user management endpoints under `/api/users`                                                               |
| Products   | CRUD and search/filter endpoints under `/api/products`                                                            |
| Categories | Tenant category endpoints under `/api/categories`                                                                 |
| Brands     | Tenant brand endpoints under `/api/brands`                                                                        |
| Stock      | Movement endpoints under `/api/stock`                                                                             |
| Warehouses | Warehouse, zone, aisle, and location endpoints under `/api/warehouses`                                            |
| Inventory  | Inventory count endpoints under `/api/inventory`                                                                  |
| Dashboard  | KPI and alert endpoints under `/api/dashboard`                                                                    |

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
- [ ] Second-pass frontend refactor for large feature containers and placeholder pages.
- [ ] Barcode/QR scanner with Capacitor.
- [ ] Product image upload storage.
- [ ] CSV/export flows.
- [ ] Cypress e2e coverage.
- [ ] Production Docker image.

## License

MIT
