# Mantyx Project Memory

Mantyx is a full-stack inventory and WMS SaaS application. The official product name is **Mantyx** and the slogan is **"Precisión para tu almacén"**.

Use Mantyx in user-facing text, titles, documentation headings, and product references.

## Product Context

- Mantyx is a multi-tenant SaaS for warehouse precision, stock control, movements, locations, and inventory counts.
- The target use case is an enterprise-style portfolio project that demonstrates production architecture and interview-ready features.
- Keep architecture decisions practical, modular, and demonstrable.
- Prefer features that show enterprise concerns: RBAC, tenant isolation, auditability, real-time updates, clean UX, and maintainability.

## Current Stack

- Frontend: Angular 21 standalone components, Ionic 8.8.7, SCSS, socket.io-client.
- Mobile runtime: Capacitor 8.3.4 — `capacitor.config.ts` at workspace root, webDir = `dist/apps/web/browser`.
- Barcode scanning: `@capacitor-mlkit/barcode-scanning` 8.1.0 (native ML Kit on Android/iOS), `@zxing/browser` 0.2.0 (web/development fallback).
- Backend: NestJS 11, TypeScript.
- Database: PostgreSQL 16 with Prisma ORM 6.19.3.
- Cache/Auth: Redis 7 for refresh tokens and JWT invalidation/blacklist behavior.
- Monorepo: Nx 22.7.x.
- Local infra: Docker Compose.
- API docs: Swagger at `/api/docs` when the API is running.

## Multi-Tenancy And Roles

Mantyx is multi-tenant.

- `SUPERADMIN`: platform owner role. Can see and manage companies globally.
- `ADMIN`: tenant/company owner role. Manages only their own company users, categories, and brands.
- `MANAGER`: operational supervisor role.
- `OPERATOR`: warehouse operations role.
- `VIEWER`: read-only role.

Fresh database bootstrap requirement:

1. Create a `Company` in Prisma Studio or via a seed/script.
2. Assign the initial non-SUPERADMIN `User.companyId`.
3. Log in again so the JWT contains the new `companyId`.

Most business endpoints must be scoped by `companyId` unless explicitly platform-level and restricted to `SUPERADMIN`.

## Implemented Modules

Backend modules currently present:

- Auth: register, login, refresh, logout, JWT guards, RBAC, throttling.
- Companies: `SUPERADMIN` company management.
- Users: tenant user management.
- Categories and brands: tenant-scoped catalog setup.
- Products: product CRUD, search/filter/pagination, soft delete.
- Stock and movements: inbound, outbound, transfer, adjustment, movement history, low-stock alerts gateway.
- Warehouses: warehouses, zones, aisles, and locations.
- Inventory counts: tenant-scoped count list/detail, create, start, complete, line add/update/delete.
- Dashboard: KPIs, alerts, and latest movements.
- Global exception filter, Prisma module, Redis module, Swagger bootstrap.

Frontend areas currently present:

- Auth pages: login/register.
- Shell with Ionic side menu and global scanner FAB (functional).
- Dashboard.
- Products.
- Stock (overview with search and paginated list).
- Movements.
- Warehouses drill-down.
- Management: operational command center using dashboard stats, low-stock risk, recent movements, and quick actions.
- Admin: different views for `SUPERADMIN` and `ADMIN`.
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete actions, completed read-only state.
- Receptions: full INBOUND flow — warehouse + cascading location selector (zone→aisle→location), multi-line form, scan-to-fill product, `forkJoin` submit.
- Expeditions: full OUTBOUND flow — same pattern as Receptions but OUTBOUND, with source location and backend stock guard.
- Barcode/QR scanner: `ScannerService` with platform detection; ML Kit on native, ZXing overlay on web. Integrated in FAB, Reception modal, and Expedition modal.

## Current Frontend Architecture

- Feature containers are being kept lean by extracting list/filter/modal/detail components where practical.
- Inventory has feature-local `data-access`, `models`, status helpers, list, filters, create modal, and detail components.
- Inventory line location selector state (`zone -> aisle -> location`) lives in feature-local `inventory-line-location-state.ts`.
- Warehouses has shared frontend models in `core/models/warehouse.models.ts` and child components for breadcrumb, warehouse list, and sublevel list.
- Products has shared frontend models in `core/models/product.models.ts` and child components for filters, list, form modal, and delete modal.
- Products list, filters, pagination, and debounced search state lives in feature-local `products-list-state.ts`.
- Stock and movements use shared stock models in `core/models/stock.models.ts`; stock has a list/pagination child component, and movements has filter, list, and create modal components.
- Movements list, filters, pagination, and total label state lives in feature-local `movements-list-state.ts`.
- Receptions list, filters, and pagination state lives in feature-local `receptions-list-state.ts` (always filters `type: 'INBOUND'`).
- Expeditions list, filters, and pagination state lives in feature-local `expeditions-list-state.ts` (always filters `type: 'OUTBOUND'`).
- Dashboard has shared frontend models in `core/models/dashboard.models.ts`; `DashboardService` should remain HTTP-focused.
- Admin has shared frontend models in `core/models/user.models.ts` and `core/models/company.models.ts`, plus child components for company list, users panel, and catalog panel.
- Admin category/brand list, modal, save, and delete orchestration is shared through feature-local `admin-catalog-state.ts`.
- Warehouses hierarchy selection and breadcrumb navigation state is shared through feature-local `warehouse-navigation-state.ts`.
- Auth and socket payload types live in `core/models`; `core/services` should not export shared DTO/model interfaces.
- `core/services` should remain HTTP/service focused; shared model/DTO types should live in `core/models` or feature-local `models`.
- `ScannerService` (`core/services/scanner.service.ts`) exposes `scan(): Observable<ScanResult | null>` and `showOverlay = signal(false)`.
- `ScannerOverlayComponent` (`core/scanner/`) renders a ZXing camera overlay on web; the shell hosts it with `@if (scannerService.showOverlay())`.
- Reception and Expedition modals are smart (inject `WarehousesService` + `ProductsService` + `ScannerService`).
- Scan-to-fill matches scanned `rawValue` against the already-loaded `products()` signal by `barcode` or `sku` — no extra API call needed.
- `StockLocationEntry` and `StockByProductResponse` are typed interfaces in `core/models/stock.models.ts`.

Remaining frontend work:

- `_shared.scss` owns shared action button variants, `.input-with-scan`, and `.btn-scan` (amber scan button pattern used in Reception/Expedition).
- Management is implemented as an operational command center.
- Inventory scanner integration (scan location QR to auto-fill location selector) is deferred — requires a backend location-search-by-code endpoint.
- Optional: cancel support for `CANCELLED` inventory counts.

## Remaining Product Focus

- Inventory counts are implemented and hardened with service unit tests under `apps/api/src/inventory`.
- Inventory lines are unique per `(inventoryCountId, locationId)` via Prisma schema and migration `20260602142000_inventory_line_location_unique`.
- Stock service now has focused unit tests for movement scoping, source-location stock guards, inbound audit/alerts, and overview filtering.
- Products service now validates category/brand tenant ownership for create/update/list filters and has unit tests for product scoping, catalog ownership, duplicate SKU handling, and soft delete.
- Warehouses service now has unit tests for company scoping, hierarchy ownership, duplicate handling, and protected deletes.
- Next roadmap items: product image upload/storage, CSV/export flows, Cypress e2e coverage, production Docker image.
- To build natively for Android: `pnpm nx build web` → `npx cap add android` → `npx cap sync` → open in Android Studio.
- `npx cap add ios` requires macOS/Xcode.

## Visual Direction

- Theme: dark slate/navy enterprise SaaS.
- Accent: warm amber `#f59e0b`.
- Typography: Plus Jakarta Sans.
- Navigation: Ionic `IonMenu` side drawer for authenticated routes.
- Auth pages are full-screen and do not show the app menu.
- Scanner is a global FAB (barcode icon, bottom-right corner), not a regular menu section.
- Avoid futuristic, neon, holographic, or 3D visual effects.
- Do not use Inter, Roboto, or Arial as the primary brand font.
- Before building a new visual page from scratch, ask for a design reference if the direction is unclear.

Approved shell menu (in order):

| Label | Icon | Roles |
|---|---|---|
| Dashboard | `home-outline` | ALL_ROLES |
| Productos | `cube-outline` | MANAGERS_UP |
| Stock | `analytics-outline` | ALL_ROLES |
| Movimientos | `swap-horizontal-outline` | OPERATOR+ |
| Inventario | `clipboard-outline` | OPERATOR+ |
| Recepciones | `download-outline` | OPERATOR+ |
| Expediciones | `send-outline` | OPERATOR+ |
| Almacenes | `business-outline` | MANAGERS_UP |
| Management | `bar-chart-outline` | MANAGERS_UP |
| Administración | `settings-outline` | ADMINS_UP |

## Angular Rules

- Every Angular component must use three separate files:
  - `name.component.ts`
  - `name.component.html`
  - `name.component.scss`
- Do not use inline `template` or inline `styles` for components.
- Component decorators should use `templateUrl` and `styleUrl`.
- Shared/repeated CSS patterns go in `apps/web/src/styles/_shared.scss`, imported from `styles.scss`.
- Component SCSS should contain only component-specific layout and styles.
- Reuse shared classes for headers, buttons, filters, modals, forms, empty states, pagination, and common actions when available.

## Package And Tooling Rules

- Use `pnpm` for dependency installation and restoring dependencies.
- Do not run `npm install` in this project.
- Project skills are managed with `npx autoskills`; rerun it after stack or skill changes. Installed skills are locked in `skills-lock.json`.
- The workspace declares `packageManager: pnpm@11.5.0`; if `pnpm` is not on PATH, use Corepack (`corepack pnpm ...`) or enable it locally. On Windows, `corepack enable` can require an Administrator shell.
- Package scripts call local Nx directly and should be run through `pnpm`, for example `pnpm run start:api`.
- For direct Nx commands, prefer `pnpm nx ...`.
- Use Nx for build, test, lint, e2e, and affected workflows.
- Prefix Nx commands with the workspace package manager where practical, for example `pnpm nx build api`.

## Prisma Rules

- Use Prisma 6 in this project.
- Do not upgrade to Prisma 7 without an explicit migration plan.
- Prisma 7 removed traditional `datasource.url` support and would require a different config/adapter setup.
- If adding Prisma packages, pin to `prisma@^6` and `@prisma/client@^6`.

On Windows PowerShell, Nx-wrapped interactive Prisma migrations can hang. Prefer:

```bash
npx dotenv -e apps/api/.env -- prisma migrate dev --schema=apps/api/prisma/schema.prisma --name <migration-name>
```

For applying already-created migrations to an existing database, use:

```bash
npx dotenv -e apps/api/.env -- prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

Before applying migrations that add unique constraints, check whether existing data violates the constraint.

## GitHub And CI

- Remote: `https://github.com/joancl99/Mantyx.git`.
- Main branch: `main`.
- Before merging to `main`, run formatting and affected lint from the development branch.
- If the workspace is not connected to Nx Cloud, do not leave `nxCloudId` in `nx.json`; it can break CI authorization.

## Commit Message Style

- Use English commit messages.
- Use a concise Conventional Commit subject, for example `refactor: organize frontend models and shared styles`.
- For non-trivial commits, include an explanatory body like the recent project commits: a short summary paragraph followed by bullet points grouped by area/file/module.
- Mention the meaningful behavior, hardening, refactor, documentation, and verification details instead of only listing files.
- Keep commit bodies factual and step-by-step so the project history can be read as implementation documentation.

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `pnpm nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax
