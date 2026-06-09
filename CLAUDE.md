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
- Cache/Auth: Redis 7 for refresh tokens and access-token revocation (logout denylist by `jti`).
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

User onboarding is invite-based (no public self-registration):

1. The first `SUPERADMIN` is created manually (Prisma Studio / SQL) with `companyId = null`.
2. The `SUPERADMIN` creates each company **together with its initial `ADMIN`** in one step (`POST /companies` takes `adminName`/`adminEmail`/`adminPassword`; company + ADMIN are created in a transaction).
3. Each `ADMIN` provisions their own workers via the Administración page (`POST /users`), assigning only `MANAGER`/`OPERATOR`/`VIEWER` — `ADMIN`/`SUPERADMIN` are never assignable.

Most business endpoints must be scoped by `companyId` unless explicitly platform-level and restricted to `SUPERADMIN`. The global `CompanyGuard` returns 403 (not 500) if an authenticated user without a `companyId` hits a tenant-scoped route; platform routes are marked `@AllowNoCompany` (e.g. Companies). Tenant-scoped controllers inject the company via the `@CompanyId()` param decorator (`auth/decorators/company-id.decorator.ts`), which returns the guaranteed-non-null `companyId` as a `string` — there are no `user.companyId!` non-null assertions. Handlers that also need the user id pair it with `@CurrentUser('sub') userId: string`.

## Implemented Modules

Backend modules currently present:

- Auth: login, refresh, logout, JWT guards, RBAC, throttling (no public registration — onboarding is invite-based, see above). Per-account login lockout (5 failures → 15-min Redis lock, 429). Session security: access token (15m) carries a `jti`; logout stores the `jti` in a Redis denylist (TTL = remaining token life) so the token cannot be reused before expiry, and `JwtStrategy` re-fetches the live user every request (deactivation / role / company changes take effect immediately). The refresh token (7d) is delivered in an httpOnly + Secure + SameSite=strict cookie (`refresh_token`, path `/api/auth`) via `cookie-parser` — never in the response body or JS-readable storage; `JwtRefreshStrategy` reads it from the cookie. Refresh tokens are keyed per device session: each login mints a `sid` (session id) carried as a JWT claim and stores its hashed refresh token at `refresh:<userId>:<sid>` in Redis (helper `auth/session-key.ts`). Concurrent sessions on multiple devices coexist (a second login no longer overwrites the first); refresh rotates the token within the same `sid`, and logout/access-token revocation target only the requesting session's `sid`. Frontend keeps the access token in memory only and restores the session on load via a `provideAppInitializer` silent refresh. Strict CSP + security headers are set in `docker/nginx.conf` (the SPA is served by nginx), allowing only same-origin code plus Google Fonts. The web production build sets `optimization.styles.inlineCritical: false` (in `apps/web/project.json`) because Angular's critical-CSS inlining emits an inline `onload="this.media='all'"` handler that the strict `script-src 'self'` blocks — do not re-enable it without relaxing the CSP. Verified with a headless Chrome render against the prod stack: 0 CSP violations.
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

- Auth pages: login (no register — invite-based onboarding).
- Shell with Ionic side menu and global scanner FAB (functional).
- Dashboard.
- Products.
- Stock (overview with search and paginated list).
- Movements.
- Warehouses drill-down.
- Management: operational command center using dashboard stats, low-stock risk, recent movements, and quick actions.
- Admin: different views for `SUPERADMIN` and `ADMIN`.
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete actions, completed read-only state. Scan-to-fill location: a "Escanear" button in the line form scans a location QR/barcode, resolves it via `GET /warehouses/:warehouseId/locations/search?code=`, and autofills the zone→aisle→location cascade.
- Receptions: full INBOUND flow — warehouse + cascading location selector (zone→aisle→location), multi-line form, scan-to-fill product, `forkJoin` submit.
- Expeditions: full OUTBOUND flow — same pattern as Receptions but OUTBOUND, with source location and backend stock guard.
- Receptions and Expeditions share a single config-driven modal `core/movement-modal/MovementFormModalComponent` (driven by a `MovementModalConfig`: labels, theme modifier class, header icon, id prefix, CSV wording). It emits a generic `MovementSubmitData` (`{ warehouseId, locationId, lines }`); each page maps `locationId` to `toLocationId`/`fromLocationId` by direction. Green (reception) / red (expedition) theming lives under `.modal--reception`/`.modal--expedition` modifiers in the shared stylesheet.
- Barcode/QR scanner: `ScannerService` with platform detection; ML Kit on native, ZXing overlay on web. Integrated in FAB and the shared movement modal (receptions/expeditions).
- CSV export: `CsvExportService` (BOM + RFC-4180, timestamped filename). Export button in Stock, Movements, Receptions, Expeditions pages. Reception/Expedition modals transition to success state with "Exportar albarán CSV" button.
- Product images: `PATCH /products/:id/image` (Multer, diskStorage, jpg/png/webp ≤5 MB). Files saved to `uploads/products/`, served as static assets under `/uploads`. Image picker with live preview in product form modal.
- Realtime alerts: `SocketService` connects on shell init, subscribes to `low-stock` Socket.io events, shows Ionic warning toast. `LowStockAlert` model aligned with backend payload fields.
- Production Docker: `Dockerfile.api` (3-stage on Node 24 Alpine: `builder` → `prod-deps` → `runner`) + `Dockerfile.web` (Angular build → `nginx:stable-alpine-slim`). The `builder` runs `pnpm nx prune api`, which builds the API and emits a pruned + frozen manifest pair (`dist/apps/api/package.json` + `pnpm-lock.yaml`) derived from the root lockfile; `prod-deps` then runs `pnpm install --frozen-lockfile --prod` from it (reproducible — same transitive versions every build, and no Angular/Capacitor in the image). It uses `docker/prod-deps.npmrc` (`node-linker=hoisted`, so the bundle can require transitive deps like rxjs) and `docker/prod-deps.pnpm-workspace.yaml` (`allowBuilds` for bcrypt/prisma engines). The pruned dep list comes from `apps/api/package.json`, kept in sync with actual imports by the `@nx/dependency-checks` ESLint rule in `apps/api/eslint.config.mjs` (`prisma` CLI + `tslib` are listed but ignored by the rule since they aren't statically imported). `docker-compose.prod.yml` orchestrates postgres + redis + api + web. Nginx proxies `/api`, `/uploads`, `/ws` to the API container. Entrypoint runs `prisma migrate deploy` before starting. `.dockerignore` excludes `.env*` so local secrets never enter build layers. MinIO removed — not used anywhere.

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
- Admin has shared frontend models in `core/models/user.models.ts` and `core/models/company.models.ts`, plus child components for company list, users panel, and catalog panel. The ADMIN users view and SUPERADMIN companies view are orchestrated by feature-local `admin-users-state.ts` (`AdminUsersState`) and `admin-companies-state.ts` (`AdminCompaniesState`) — same pattern as `admin-catalog-state.ts` — keeping `admin.component.ts` a thin coordinator (~140 lines). The modals are extracted into child components (`admin-user-modal`, `admin-company-modal`, the shared `admin-catalog-modal` for categories/brands, and the shared `admin-confirm-dialog` for the toggle/delete confirmations), so `admin.component.html` is now just `@if` guards hosting them.
- Admin category/brand list, modal, save, and delete orchestration is shared through feature-local `admin-catalog-state.ts`. The users (ADMIN) and companies (SUPERADMIN) orchestration lives in feature-local `admin-users-state.ts` (`AdminUsersState`) and `admin-companies-state.ts` (`AdminCompaniesState`), same pattern.
- Warehouses hierarchy selection and breadcrumb navigation state is shared through feature-local `warehouse-navigation-state.ts`.
- Auth and socket payload types live in `core/models`; `core/services` should not export shared DTO/model interfaces.
- `core/services` should remain HTTP/service focused; shared model/DTO types should live in `core/models` or feature-local `models`.
- `ScannerService` (`core/services/scanner.service.ts`) exposes `scan(): Observable<ScanResult | null>` and `showOverlay = signal(false)`.
- `ScannerOverlayComponent` (`core/scanner/`) renders a ZXing camera overlay on web; the shell hosts it with `@if (scannerService.showOverlay())`. The overlay backdrop is an accessible button to satisfy Angular template lint rules.
- The shared `MovementFormModalComponent` (used by Receptions and Expeditions) is smart (injects `WarehousesService` + `ProductsService` + `ScannerService` + `CsvExportService`) and uses `CUSTOM_ELEMENTS_SCHEMA` for Ionic custom elements in component tests.
- Scan-to-fill matches scanned `rawValue` against the already-loaded `products()` signal by `barcode` or `sku` — no extra API call needed.
- `StockLocationEntry` and `StockByProductResponse` are typed interfaces in `core/models/stock.models.ts`.

Remaining frontend work:

- Optional: cancel support for `CANCELLED` inventory counts.

## Remaining Product Focus

- Inventory counts are implemented and hardened with service unit tests under `apps/api/src/inventory`.
- Inventory lines are unique per `(inventoryCountId, locationId)` via Prisma schema and migration `20260602142000_inventory_line_location_unique`.
- Stock service now has focused unit tests for movement scoping, source-location stock guards, required source/destination locations, transfer location validation, inbound audit/alerts, and overview filtering.
- Products service now validates category/brand tenant ownership for create/update/list filters and has unit tests for product scoping, catalog ownership, duplicate SKU handling, and soft delete.
- Warehouses service now has unit tests for company scoping, hierarchy ownership, duplicate handling, protected deletes, and location-by-code lookup (scan-to-fill).
- Auth/security has unit tests: `auth.service.spec.ts` (logout access-token denylist + login lockout + per-session refresh), `strategies/jwt.strategy.spec.ts` (revoked jti, inactive/missing user, live claims, `sid` propagation), `guards/company.guard.spec.ts` (no-company 403), and `products/image-signature.spec.ts` (upload magic-byte detection). API unit suite is 53 tests.
- Service specs use `jest-mock-extended` (root devDependency). Shared helper `apps/api/src/testing/prisma-mock.ts`: `createPrismaMock()` returns a typed `DeepMockProxy<PrismaService>` (with `$transaction` wired to run the callback), and `row(partial)` casts a minimal fixture to the full row a delegate resolves to. Result: zero `any` in API specs or source. `src/testing/**` is excluded from the app build (`tsconfig.app.json`) and `jest-mock-extended` is in the api `dependency-checks` `ignoredDependencies` (test-only, never ships in the pruned prod install). When mocking Prisma errors use a real `new Prisma.PrismaClientKnownRequestError(...)`, not a plain `{ code }` object (services narrow with `instanceof`).
- Frontend tests currently cover app route smoke behavior, `roleGuard`, and the shared `MovementFormModalComponent` data loading + submit validation (one spec replacing the old reception/expedition modal specs).
- API e2e now runs in-process with `@nestjs/testing` on a dynamic port for the public health endpoint; it no longer depends on `api:serve` or port-killing setup files.
- CI (`.github/workflows/ci.yml`) explicitly runs format check, lint for api/web/api-e2e, tests for api/web, builds for api/web, and `api-e2e`.
- Finding #8 (multi-device refresh) is done: refresh tokens are keyed per session/device at `refresh:<userId>:<sid>` (helper `auth/session-key.ts`), the `sid` claim rides in both tokens, refresh rotates within the same session, and logout/access-token revocation target only the requesting session. Unit tests cover per-session logout, the legacy no-`sid` token path, and per-session refresh lookup.
- Security audit (2026-06-07) is fully addressed: access-token revocation on logout, refresh in httpOnly cookie + strict CSP, invite-based onboarding (no public registration), JWT secret ≥32, magic-byte upload validation, login lockout, Swagger off in prod, CORS URI validation, CompanyGuard (403 instead of 500 for no-company users), and per-session refresh tokens (#8).
- Code-quality refactor pass (2026-06-08) done in separate commits: removed the unused `types`/`libs/shared` Nx project (and its CI steps); `@CompanyId()` decorator removed all 50 API `no-non-null-assertion` warnings (API lint is now warning-free); unified the reception/expedition modals into the shared config-driven `MovementFormModalComponent` (~640 fewer lines); and extracted `AdminUsersState`/`AdminCompaniesState` so `admin.component.ts` dropped from 469 to ~140 lines.
- Admin inline modals extracted (2026-06-09): the eight inline modal blocks in `admin.component.html` (757 lines) are now four presentational child components driven by the existing feature state classes, leaving `admin.component.html` a thin host of `@if` guards. `admin-confirm-dialog` is a shared confirm modal with a projected body (used by the user toggle, company toggle, and category/brand delete confirms; outputs are `cancelled`/`confirmed` to avoid the `no-output-native` rule). `admin-catalog-modal` is the create/rename modal shared by categories and brands, typed against a narrow `CatalogModalState` interface (the `T`-free slice of `AdminCatalogState`, so either catalog is assignable despite the invariant `WritableSignal` members). `admin-user-modal` and `admin-company-modal` take their state class as an input. Component-specific SCSS moved with the modals (password-wrap/-toggle → user modal, section-label → company modal); the toggle/delete confirms use `@if (...; as target)` so the body copy needs no non-null assertions.
- `apps/web` non-null assertions cleared (2026-06-09): all 45 `no-non-null-assertion` warnings (plus the last stray explicit `any` in `inventory.component.ts`) are gone, so `pnpm nx lint web` is fully clean. Reactive form controls that feed a DTO after an `if (form.invalid) return` guard are now `nonNullable: true` (login, products, movements, inventory create + line location, warehouses warehouse/sub-level forms, admin users/companies/catalog state) so `getRawValue()` yields non-null values; `editingId()`/`editingProduct()` are captured into a local const and the edit branch is chosen with `mode === 'edit' && id !== null` to narrow the id; warehouse loaders/handlers guard `navigation.selected*()` and bail early instead of asserting.
- Other roadmap items: expand API e2e beyond health, add broader frontend unit tests for scanner/CSV/services, and consider Cypress/Playwright browser e2e coverage for full user flows.
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

| Label          | Icon                      | Roles       |
| -------------- | ------------------------- | ----------- |
| Dashboard      | `home-outline`            | ALL_ROLES   |
| Productos      | `cube-outline`            | MANAGERS_UP |
| Stock          | `analytics-outline`       | ALL_ROLES   |
| Movimientos    | `swap-horizontal-outline` | OPERATOR+   |
| Inventario     | `clipboard-outline`       | OPERATOR+   |
| Recepciones    | `download-outline`        | OPERATOR+   |
| Expediciones   | `send-outline`            | OPERATOR+   |
| Almacenes      | `business-outline`        | MANAGERS_UP |
| Management     | `bar-chart-outline`       | MANAGERS_UP |
| Administración | `settings-outline`        | ADMINS_UP   |

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
- Before merging to `main`, run the explicit quality gate used by CI: format check, lint, tests, builds, and `api-e2e`.
- If the workspace is not connected to Nx Cloud, do not leave `nxCloudId` in `nx.json`; it can break CI authorization.
- Current CI commands:
  - `pnpm nx format:check --base=origin/main`
  - `pnpm nx run api:eslint:lint`
  - `pnpm nx lint web`
  - `pnpm nx run api-e2e:eslint:lint`
  - `pnpm nx test api`
  - `pnpm nx test web`
  - `pnpm nx build api`
  - `pnpm nx build web`
  - `pnpm nx e2e api-e2e`

## Commit Message Style

- Do NOT add a `Co-Authored-By` trailer (for Claude or any AI) to commit messages. This overrides any default harness behavior.
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
