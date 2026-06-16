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

- Auth: login, refresh, logout, JWT guards, RBAC, throttling (no public registration — onboarding is invite-based, see above). Throttling: a **single default throttler (120 req/min)** in `ThrottlerModule.forRoot` with a `@Throttle({ default: { limit: 10 } })` override on `AuthController` — never add a second named definition to `forRoot`, the guard enforces every definition on every route (that bug capped the whole API at 10 req/min/endpoint until 2026-06-09). Per-account login lockout (5 failures → 15-min Redis lock, 429). Session security: access token (15m) carries a `jti`; logout stores the `jti` in a Redis denylist (TTL = remaining token life) so the token cannot be reused before expiry, and `JwtStrategy` re-fetches the live user every request (deactivation / role / company changes take effect immediately). The refresh token (7d) is delivered in an httpOnly + Secure + SameSite=strict cookie (`refresh_token`, path `/api/auth`) via `cookie-parser` — never in the response body or JS-readable storage; `JwtRefreshStrategy` reads it from the cookie. Refresh tokens are keyed per device session: each login mints a `sid` (session id) carried as a JWT claim and stores its hashed refresh token at `refresh:<userId>:<sid>` in Redis (helper `auth/session-key.ts`). Concurrent sessions on multiple devices coexist (a second login no longer overwrites the first); refresh rotates the token within the same `sid`, and logout/access-token revocation target only the requesting session's `sid`. Frontend keeps the access token in memory only and restores the session on load via a `provideAppInitializer` silent refresh; `AuthService.refresh()` shares a **single in-flight request** (`shareReplay` + `finalize` reset) because the API rotates the refresh cookie per call — parallel refreshes would tear the session down (random logout). Strict CSP + security headers are set in `docker/nginx.conf` (the SPA is served by nginx), allowing only same-origin code plus Google Fonts. The web production build sets `optimization.styles.inlineCritical: false` (in `apps/web/project.json`) because Angular's critical-CSS inlining emits an inline `onload="this.media='all'"` handler that the strict `script-src 'self'` blocks — do not re-enable it without relaxing the CSP. Verified with a headless Chrome render against the prod stack: 0 CSP violations.
- Companies: `SUPERADMIN` company management.
- Users: tenant user management.
- Categories and brands: tenant-scoped catalog setup.
- Products: product CRUD, search/filter/pagination, soft delete.
- Stock and movements: inbound, outbound, transfer, adjustment, return, movement history, low-stock alerts gateway. `POST /stock/movements` is `@Roles(ADMIN, MANAGER, OPERATOR)` (VIEWER is read-only). RETURN is handled explicitly as an inbound-style increment at `toLocationId` (it used to fall into the ADJUSTMENT absolute-set branch and destroy stock). OUTBOUND/TRANSFER decrements are atomic: `decrementSourceStock()` puts the availability guard inside the `updateMany` (`quantity: { gte } }` + count check) so concurrent movements can't drive stock negative. TRANSFER also rejects `fromLocationId === toLocationId` before any mutation. Stock entries are unique per `(productId, locationId)`. The stock overview paginates in SQL, and the low-stock filter + dashboard KPI counters run as raw `GROUP BY/HAVING` aggregates (`SUM(quantity) <= minStock` is an aggregate-to-column comparison Prisma can't express) instead of loading all tenant products into memory.
- Stock alerts gateway (`StockAlertsGateway`, namespace `/ws`): **authenticated** — the socket.io handshake must carry a valid access token in `auth.token` (denylisted `jti` rejected against Redis), authenticated clients join a per-tenant `company:<id>` room, and `emitLowStock(companyId, payload)` emits only to that room (never a global broadcast — that leaked stock data across tenants until 2026-06-09). SUPERADMIN connects but joins no room.
- Warehouses: warehouses, zones, aisles, and locations.
- Inventory counts: tenant-scoped count list/detail, create, start, complete, cancel, line add/update/delete. `PATCH /inventory/:id/cancel` (`@Roles(ADMIN, MANAGER)`) cancels DRAFT/IN_PROGRESS counts; the status update and the AuditLog row (acting user from `@CurrentUser('sub')`) are written in one transaction, mirroring complete. COMPLETED/CANCELLED counts are rejected; a cancelled count is read-only.
- Dashboard: KPIs, alerts, and latest movements.
- Audit: global `AuditModule`. `AuditService.log()` writes an `AuditLog` row and never breaks the business op (failures are swallowed + logged); `GET /audit` (`@Roles(ADMIN)`, company-scoped, action/entityType filters + pagination). Writers: auth (LOGIN/LOGOUT, with ip/userAgent), products + users controllers (CREATE/UPDATE/DELETE — passwords never stored in `changes`), and the existing in-transaction writes from stock movements + inventory completion.
- Global exception filter, Prisma module, Redis module, Swagger bootstrap. `main.ts` sets **`trust proxy = 1`** (nginx is the single hop in prod): without it `req.ip` was the nginx container IP, so the throttler put every user in ONE shared rate-limit bucket and auth audit rows stored the proxy IP. The api-e2e bootstrap mirrors the setting. `InventoryService.complete()` attributes its audit row to the acting user from `@CurrentUser('sub')` (it used to claim the count creator did it). `apps/api-e2e` exposes only its `e2e` target — the `@nx/jest/plugin` in `nx.json` excludes it so `nx run-many -t test` never boots the Docker-dependent e2e suite; `passWithNoTests` removed from the api/api-e2e jest targets.

Frontend areas currently present:

- Auth pages: login (no register — invite-based onboarding).
- Shell with Ionic side menu and global scanner FAB (functional).
- Dashboard.
- Products.
- Stock (overview with search and paginated list).
- Movements.
- Warehouses drill-down.
- Management: operational command center using dashboard stats, low-stock risk, recent movements, and quick actions.
- Admin: different views for `SUPERADMIN` and `ADMIN`. The ADMIN view has Usuarios / Categorías / Marcas / **Auditoría** tabs; the Auditoría tab shows the company audit trail with action/entity-type filters and pagination.
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete/cancel actions, completed/cancelled read-only state. The cancel button (DRAFT/IN_PROGRESS) uses a two-step inline confirm held in a `linkedSignal` sourced from the `count` input, so it resets whenever another count loads. Scan-to-fill location: a "Escanear" button in the line form scans a location QR/barcode, resolves it via `GET /warehouses/:warehouseId/locations/search?code=`, and autofills the zone→aisle→location cascade.
- Receptions: full INBOUND flow — warehouse + cascading location selector (zone→aisle→location), multi-line form, scan-to-fill product, `forkJoin` submit.
- Expeditions: full OUTBOUND flow — same pattern as Receptions but OUTBOUND, with source location and backend stock guard.
- Receptions and Expeditions share a single config-driven modal `core/movement-modal/MovementFormModalComponent` (driven by a `MovementModalConfig`: labels, theme modifier class, header icon, id prefix, CSV wording). It emits a generic `MovementSubmitData` (`{ warehouseId, locationId, lines }`); each page maps `locationId` to `toLocationId`/`fromLocationId` by direction. Green (reception) / red (expedition) theming lives under `.modal--reception`/`.modal--expedition` modifiers in the shared stylesheet.
- Barcode/QR scanner: `ScannerService` with platform detection; ML Kit on native, ZXing overlay on web. Integrated in FAB and the shared movement modal (receptions/expeditions).
- CSV export: `CsvExportService` (BOM + RFC-4180, timestamped filename). Export button in Stock, Movements, Receptions, Expeditions pages. Reception/Expedition modals transition to success state with "Exportar albarán CSV" button.
- Product images: `PATCH /products/:id/image` (Multer, diskStorage, jpg/png/webp ≤5 MB). Files saved to `uploads/products/`, served as static assets under `/uploads`. Image picker with live preview in product form modal.
- Realtime alerts: `SocketService` connects on shell init, subscribes to `low-stock` Socket.io events, shows Ionic warning toast. `LowStockAlert` model aligned with backend payload fields. `connect()` passes `auth` as a callback that reads `AuthService.accessToken()` on every (re)connection, so reconnects after a server-side drop carry a fresh token (not the stale handshake one).
- Production Docker: `Dockerfile.api` (3-stage on Node 24 Alpine: `builder` → `prod-deps` → `runner`) + `Dockerfile.web` (Angular build → `nginx:stable-alpine-slim`). The `builder` runs `pnpm nx prune api`, which builds the API and emits a pruned + frozen manifest pair (`dist/apps/api/package.json` + `pnpm-lock.yaml`) derived from the root lockfile; `prod-deps` then runs `pnpm install --frozen-lockfile --prod` from it (reproducible — same transitive versions every build, and no Angular/Capacitor in the image). It uses `docker/prod-deps.npmrc` (`node-linker=hoisted`, so the bundle can require transitive deps like rxjs) and `docker/prod-deps.pnpm-workspace.yaml` (`allowBuilds` for bcrypt/prisma engines). The pruned dep list comes from `apps/api/package.json`, kept in sync with actual imports by the `@nx/dependency-checks` ESLint rule in `apps/api/eslint.config.mjs` (`prisma` CLI + `tslib` are listed but ignored by the rule since they aren't statically imported). `docker-compose.prod.yml` orchestrates postgres + redis + api + web. Nginx proxies `/api`, `/uploads`, `/ws` to the API container. Entrypoint runs `prisma migrate deploy` before starting. `.dockerignore` excludes `.env*` so local secrets never enter build layers. MinIO removed — not used anywhere.

## Current Frontend Architecture

- Feature containers are being kept lean by extracting list/filter/modal/detail components where practical.
- Inventory has feature-local `data-access`, `models`, status helpers, list, filters, create modal, and detail components.
- Inventory line location selector state (`zone -> aisle -> location`) lives in feature-local `inventory-line-location-state.ts`.
- Warehouses has shared frontend models in `core/models/warehouse.models.ts` and child components for breadcrumb, warehouse list, and sublevel list.
- Products has shared frontend models in `core/models/product.models.ts` and child components for filters, list, form modal, and delete modal.
- Products list, filters, pagination, and debounced search state lives in feature-local `products-list-state.ts`.
- Stock and movements use shared stock models in `core/models/stock.models.ts`; stock has a list/pagination child component, and movements has filter, list, and the TRANSFER-only create modal (smart: loads the product's stock entries for the origin and the destination zone→aisle→location cascade, emits `TransferSubmitData`).
- All 12 smart container pages (dashboard, products, stock, movements, inventory, receptions, expeditions, warehouses, management, admin, login, shell) use `ChangeDetectionStrategy.OnPush`, alongside the presentational children. They are signal/computed-driven; reactive-form error display is gated by `submitted` signals.
- Movements list, filters, pagination, and total label state lives in feature-local `movements-list-state.ts`.
- Receptions list, filters, and pagination state lives in feature-local `receptions-list-state.ts` (always filters `type: 'INBOUND'`).
- Expeditions list, filters, and pagination state lives in feature-local `expeditions-list-state.ts` (always filters `type: 'OUTBOUND'`).
- Dashboard has shared frontend models in `core/models/dashboard.models.ts`; `DashboardService` should remain HTTP-focused.
- Admin has shared frontend models in `core/models/user.models.ts` and `core/models/company.models.ts`, plus child components for company list, users panel, and catalog panel. The ADMIN users view and SUPERADMIN companies view are orchestrated by feature-local `admin-users-state.ts` (`AdminUsersState`) and `admin-companies-state.ts` (`AdminCompaniesState`) — same pattern as `admin-catalog-state.ts` — keeping `admin.component.ts` a thin coordinator (~140 lines). The modals are extracted into child components (`admin-user-modal`, `admin-company-modal`, the shared `admin-catalog-modal` for categories/brands, and the shared `admin-confirm-dialog` for the toggle/delete confirmations), so `admin.component.html` is now just `@if` guards hosting them.
- Admin category/brand list, modal, save, and delete orchestration is shared through feature-local `admin-catalog-state.ts`. The users (ADMIN) and companies (SUPERADMIN) orchestration lives in feature-local `admin-users-state.ts` (`AdminUsersState`) and `admin-companies-state.ts` (`AdminCompaniesState`), same pattern. The Auditoría tab is orchestrated by feature-local `admin-audit-state.ts` (`AdminAuditState`: filters + pagination) feeding the presentational `admin-audit-panel` child.
- Warehouses hierarchy selection and breadcrumb navigation state is shared through feature-local `warehouse-navigation-state.ts`.
- Auth and socket payload types live in `core/models`; `core/services` should not export shared DTO/model interfaces.
- `core/services` should remain HTTP/service focused; shared model/DTO types should live in `core/models` or feature-local `models`.
- `ScannerService` (`core/services/scanner.service.ts`) exposes `scan(): Observable<ScanResult | null>` and `showOverlay = signal(false)`.
- `ScannerOverlayComponent` (`core/scanner/`) renders a ZXing camera overlay on web; the shell hosts it with `@if (scannerService.showOverlay())`. The overlay backdrop is an accessible button to satisfy Angular template lint rules.
- The shared `MovementFormModalComponent` (used by Receptions and Expeditions) is smart (injects `WarehousesService` + `ProductsService` + `ScannerService` + `CsvExportService`) and uses `CUSTOM_ELEMENTS_SCHEMA` for Ionic custom elements in component tests.
- Scan-to-fill matches scanned `rawValue` against the already-loaded `products()` signal by `barcode` or `sku` — no extra API call needed.
- `StockLocationEntry` and `StockByProductResponse` are typed interfaces in `core/models/stock.models.ts`.

## Next Session Plan (agreed 2026-06-09) — DONE 2026-06-10

All four agreed items were built and committed on `dev` (commits `6d6f9e1`, `0148695`, `4b0973b`, `963b445`), each verified with lint + build + tests:

1. **Movements page → TRANSFER-only creation flow.** ✅ The Movements page now only MOVES stock between locations (Receptions/Expeditions own inbound/outbound). The `create-movement-modal` is a smart transfer flow: pick product → origin from the product's stock entries (`GET /stock/by-product/:id`, shows warehouse + location + available qty, implies the warehouse) → destination via the zone→aisle→location cascade within that same warehouse → quantity (capped at origin qty) + notes. It emits `TransferSubmitData`; the page maps it to a `CreateMovementDto` with `type: 'TRANSFER'` and `warehouseId` from the origin entry. `MOVEMENT_FORM_TYPES` removed (kept `MOVEMENT_TYPE_CONFIG` for list/filter labels). Backend rejects `fromLocationId === toLocationId` for TRANSFER (+ unit test).
2. **Auditoría page for ADMIN.** ✅ Global `AuditModule` with `AuditService.log()` (swallows failures — never breaks the business op) and `findAll`; `GET /audit` (`@Roles(ADMIN)`, company-scoped, action/entityType filters + pagination on the `(companyId, createdAt)` index). Writes broadened: LOGIN/LOGOUT in `AuthService` (ip/userAgent threaded from the controller) and CREATE/UPDATE/DELETE in the products + users controllers (passwords never stored in `changes`). Frontend `core/models/audit.models.ts` + `core/services/audit.service.ts` + feature-local `admin-audit-state.ts` + presentational `admin-audit-panel` (OnPush) as a new "Auditoría" tab in the ADMIN view. Unit tests: log writes the row, log swallows a DB failure, findAll scopes by company.
3. **OnPush for the smart container pages.** ✅ `ChangeDetectionStrategy.OnPush` extended to the 12 container pages (dashboard, products, stock, movements, inventory, receptions, expeditions, warehouses, management, admin, login, shell). All are signal/computed-driven; reactive-form error display is gated by `submitted` signals and refreshed by the input events that already mark an OnPush view for check.
4. **Socket reconnect with a fresh token.** ✅ `SocketService.connect()` now passes `auth` as a callback that reads `AuthService.accessToken()` on every (re)connection, so reconnects carry the current token instead of the stale handshake one. `connect()` dropped its token argument; the shell guards on being logged in.

Remaining frontend work: none pending — inventory count cancellation (the last optional item) was implemented on 2026-06-11 (commit `28236c1`).

## Remaining Product Focus

- Inventory counts are implemented and hardened with service unit tests under `apps/api/src/inventory`.
- Inventory lines are unique per `(inventoryCountId, locationId)` via Prisma schema and migration `20260602142000_inventory_line_location_unique`.
- Stock service now has focused unit tests for movement scoping, source-location stock guards, required source/destination locations, transfer location validation, inbound audit/alerts, and overview filtering.
- Products service now validates category/brand tenant ownership for create/update/list filters and has unit tests for product scoping, catalog ownership, duplicate SKU handling, and soft delete.
- Warehouses service now has unit tests for company scoping, hierarchy ownership, duplicate handling, protected deletes, and location-by-code lookup (scan-to-fill).
- Auth/security has unit tests: `auth.service.spec.ts` (logout access-token denylist + login lockout + per-session refresh), `strategies/jwt.strategy.spec.ts` (revoked jti, inactive/missing user, live claims, `sid` propagation), `guards/company.guard.spec.ts` (no-company 403), `products/image-signature.spec.ts` (upload magic-byte detection), and `stock/stock-alerts.gateway.spec.ts` (handshake token required, invalid/revoked token disconnect, company-room join, SUPERADMIN no-room, room-scoped emit). API unit suite is 71 tests across 11 suites (adds `audit/audit.service.spec.ts` — log writes the row, log swallows a DB failure, findAll scopes by company — two inventory cancel tests (status update + audit row in the transaction; COMPLETED rejected before any mutation), and a TRANSFER same-location rejection test in the stock spec; alongside the gateway spec, `dashboard.service.spec.ts`, and stock specs for RETURN semantics, the atomic guarded decrement, DB-side overview pagination, and the raw low-stock path).
- Service specs use `jest-mock-extended` (root devDependency). Shared helper `apps/api/src/testing/prisma-mock.ts`: `createPrismaMock()` returns a typed `DeepMockProxy<PrismaService>` (with `$transaction` wired to run the callback), and `row(partial)` casts a minimal fixture to the full row a delegate resolves to. Result: zero `any` in API specs or source. `src/testing/**` is excluded from the app build (`tsconfig.app.json`) and `jest-mock-extended` is in the api `dependency-checks` `ignoredDependencies` (test-only, never ships in the pruned prod install). When mocking Prisma errors use a real `new Prisma.PrismaClientKnownRequestError(...)`, not a plain `{ code }` object (services narrow with `instanceof`).
- Frontend tests (25 tests across 8 spec files, runner `@angular/build:unit-test` = Vitest + jsdom): app route smoke behavior, `roleGuard`, the shared `MovementFormModalComponent`, `auth.service.spec.ts` (shared in-flight refresh), plus (2026-06-11) `csv-export.service.spec.ts` (RFC-4180 escaping, CRLF, BOM asserted on raw blob bytes — jsdom `Blob` has no `.text()` and FileReader text decoding consumes the BOM, read bytes via `readAsArrayBuffer`; download name + revokeObjectURL with stubbed object URLs), `scanner.service.spec.ts` (web flow: overlay signal, take(1) completion, null cancellation, consecutive scans; native branch is device-only — pin the platform with `vi.spyOn(Capacitor, 'isNativePlatform')`), `products.service.spec.ts` (filter→param mapping incl. `lowStock=false`, FormData upload), and the inventory data-access spec (param mapping, start/complete/cancel lifecycle, line update). Note: `vi.mock` module mocking is unreliable under the `@angular/build:unit-test` bundler — prefer `vi.spyOn` on objects and `HttpTestingController`; `SocketService` stays untested for that reason (mocking `socket.io-client`'s `io` would need a DI seam).
- API e2e (2026-06-11) boots the **full `AppModule` in-process** on a dynamic port (real guards/pipes/filter, Prisma, Redis sessions) against **dedicated e2e infra: database `warehouse_e2e` + Redis db 1** — `apps/api-e2e/src/support/env.ts` always forces `DATABASE_URL`/`REDIS_URL` to those targets (overridable via `E2E_DATABASE_URL`/`E2E_REDIS_URL`; CI's Redis has no password) because the Jest `globalSetup` (`support/global-setup.ts`) creates+migrates the db, **truncates all tables, flushes the Redis db**, and seeds the SUPERADMIN each run. `support/test-app.ts` replicates main.ts behavior (cookie-parser, `api` prefix, `GlobalExceptionFilter`, strict ValidationPipe). `flows.spec.ts` covers: auth session (login/refresh-cookie rotation/refresh-without-cookie/logout denylist), invite-based onboarding + role gates, catalog/warehouse setup via API, stock movements (INBOUND/over-OUTBOUND 400/OUTBOUND/same-location TRANSFER 400/TRANSFER, VIEWER read-only), and multi-tenant isolation. 28 tests / 2 suites, ~9s; stays under the 10 req/min auth throttle (5 logins + 2 refreshes). The flows also pin `trust proxy`: the admin A login sends `X-Forwarded-For` and a test asserts that forwarded IP is what lands in the audit trail. Its first run caught a real bug: `POST /auth/logout` lacked `@AllowNoCompany`, so the SUPERADMIN got 403 from `CompanyGuard` and could never revoke their token (fixed in `04cea6e`). Requires local Docker dev infra running (`docker compose -f docker/docker-compose.yml up -d`).
- CI (`.github/workflows/ci.yml`) explicitly runs format check, lint for api/web/api-e2e, tests for api/web, builds for api/web, and `api-e2e`. The job has `postgres:16-alpine` + `redis:7-alpine` **service containers** (health-checked) for the e2e suite; the E2E step sets `E2E_REDIS_URL=redis://localhost:6379/1`.
- Finding #8 (multi-device refresh) is done: refresh tokens are keyed per session/device at `refresh:<userId>:<sid>` (helper `auth/session-key.ts`), the `sid` claim rides in both tokens, refresh rotates within the same session, and logout/access-token revocation target only the requesting session. Unit tests cover per-session logout, the legacy no-`sid` token path, and per-session refresh lookup.
- Security audit (2026-06-07) is fully addressed: access-token revocation on logout, refresh in httpOnly cookie + strict CSP, invite-based onboarding (no public registration), JWT secret ≥32, magic-byte upload validation, login lockout, Swagger off in prod, CORS URI validation, CompanyGuard (403 instead of 500 for no-company users), and per-session refresh tokens (#8).
- Code-quality refactor pass (2026-06-08) done in separate commits: removed the unused `types`/`libs/shared` Nx project (and its CI steps); `@CompanyId()` decorator removed all 50 API `no-non-null-assertion` warnings (API lint is now warning-free); unified the reception/expedition modals into the shared config-driven `MovementFormModalComponent` (~640 fewer lines); and extracted `AdminUsersState`/`AdminCompaniesState` so `admin.component.ts` dropped from 469 to ~140 lines.
- Full-project audit pass (2026-06-09) done in 4 commits on `dev` (`3d939ff`, `da72a5e`, `1eb3cb3`, `93b3452`), all 15 findings fixed: (critical) `@Roles` on `POST /stock/movements`, authenticated WS gateway with per-company rooms, RETURN-as-increment fix; (important) atomic guarded stock decrements, single-default throttler, shared in-flight frontend refresh; (performance) migration `20260609192946_add_performance_indexes` — 13 indexes: `StockMovement(warehouseId, createdAt)/(productId)/(userId)`, `StockEntry(locationId)`, `InventoryCount(warehouseId, createdAt)`, `InventoryCountLine(locationId)`, `User(companyId)`, `Product(categoryId)/(brandId)`, `AuditLog(companyId, createdAt)/(userId)` — plus SQL-side overview/dashboard aggregates (raw SQL validated against the real Postgres schema via psql) and `ChangeDetectionStrategy.OnPush` on 22 presentational child components (verified stateless: signal inputs/outputs only; smart containers keep default CD); (dead code) migration `20260609194500_drop_dead_refresh_token_and_variants` dropped `users.refreshToken` + `UsersService.updateRefreshToken()` (tokens live in Redis) and the never-implemented `ProductVariant` model + `StockEntry.variantId` — the stock upserts lost their `variantId: null as unknown as string` casts and the new `(productId, locationId)` unique genuinely deduplicates (the old NULL-variant unique did not; the migration merges pre-existing duplicates before creating it); `uploadImage` uses `fs/promises`; `warehouses.controller` uses the `Role` enum.
- Admin inline modals extracted (2026-06-09): the eight inline modal blocks in `admin.component.html` (757 lines) are now four presentational child components driven by the existing feature state classes, leaving `admin.component.html` a thin host of `@if` guards. `admin-confirm-dialog` is a shared confirm modal with a projected body (used by the user toggle, company toggle, and category/brand delete confirms; outputs are `cancelled`/`confirmed` to avoid the `no-output-native` rule). `admin-catalog-modal` is the create/rename modal shared by categories and brands, typed against a narrow `CatalogModalState` interface (the `T`-free slice of `AdminCatalogState`, so either catalog is assignable despite the invariant `WritableSignal` members). `admin-user-modal` and `admin-company-modal` take their state class as an input. Component-specific SCSS moved with the modals (password-wrap/-toggle → user modal, section-label → company modal); the toggle/delete confirms use `@if (...; as target)` so the body copy needs no non-null assertions.
- `apps/web` non-null assertions cleared (2026-06-09): all 45 `no-non-null-assertion` warnings (plus the last stray explicit `any` in `inventory.component.ts`) are gone, so `pnpm nx lint web` is fully clean. Reactive form controls that feed a DTO after an `if (form.invalid) return` guard are now `nonNullable: true` (login, products, movements, inventory create + line location, warehouses warehouse/sub-level forms, admin users/companies/catalog state) so `getRawValue()` yields non-null values; `editingId()`/`editingProduct()` are captured into a local const and the edit branch is chosen with `mode === 'edit' && id !== null` to narrow the id; warehouse loaders/handlers guard `navigation.selected*()` and bail early instead of asserting.
- Browser e2e (2026-06-11): `apps/web-e2e` runs **Playwright** (`@nx/playwright` 22.7 + `@playwright/test` 1.57, Chromium only) against the real stack — 6 flows ~30s locally (`pnpm nx e2e web-e2e`): unauthenticated redirect to login, wrong-credentials error banner (with an unknown account so the per-account lockout is never fed), ADMIN role-scoped menu, full product creation through the modal (timestamped SKU so CI retries never hit the duplicate-SKU 409), VIEWER read-only menu + logout, SUPERADMIN landing on `/app/admin`. **Playwright starts `webServer`s BEFORE `globalSetup`** (plugin setup tasks precede it in the runner), so DB preparation lives in the API server command itself: `src/support/start-api.cjs` forces the same dedicated e2e targets as api-e2e (`warehouse_e2e`, Redis db 1; `E2E_DATABASE_URL`/`E2E_REDIS_URL` overrides), creates/migrates/truncates/flushes, seeds SUPERADMIN + company + ADMIN + VIEWER + one category, then `nx build api` (Nx-cached) + `node dist/apps/api/main.js` on :3000; the second webServer is `nx serve web` on :4200 (the dev `environment.ts` apiUrl points at :3000). `reuseExistingServer: false` on purpose — an already-running dev API would be wired to the dev database, failing fast on an occupied port is the safety net. The e2e target sets `skipInstall: true`; browsers are provisioned explicitly (`npx playwright install --with-deps chromium` in CI). Requires local Docker dev infra running.
- Backlog (agreed 2026-06-09) fully completed on 2026-06-11: inventory cancel, API e2e flows, frontend unit tests, and Playwright browser e2e.
- To build natively for Android: `pnpm nx build web` → `npx cap add android` → `npx cap sync` → open in Android Studio.
- `npx cap add ios` requires macOS/Xcode.

## Visual Direction

- Theme: dark slate/navy enterprise SaaS.
- Accent: warm amber `#f59e0b`.
- Typography: Plus Jakarta Sans.
- Brand assets live in `apps/web/public/brand/`: `mantyx-logo-full.png` (mantis symbol + wordmark), `mantyx-symbol.png` (mantis only), `mantyx-wordmark.png` ("Mantyx" text only). The logo's wordmark is dark, so on the dark login card and dark side menu it sits on a white rounded "plate"/badge to stay legible. Current usage: **login** shows the full logo on a white plate; the **side menu** shows the wordmark on a white plate; the **favicon** (`apps/web/public/favicon.ico` + `favicon-16x16.png`/`favicon-32x32.png`/`apple-touch-icon.png`, linked in `index.html`) is generated from the green mantis symbol. Logos are plain `<img>` static assets — no ion-icon placeholder (`cube-sharp` was removed).
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
- After a fresh clone (before tests/build), generate the Prisma client with `pnpm run db:generate` (= `prisma generate --schema=apps/api/prisma/schema.prisma`). Without it, the API test/build fails with missing `@prisma/client` types — see GitHub And CI.
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
- **Branching: three-branch promotion flow `dev → pre → main`** (stages by maturity: development → pre-prod/staging → production). All daily work and commits land on `dev`; pushing `dev` (`git push origin dev`) is the default. `pre`/`main` are touched only when explicitly asked to "promote" / "merge to main". Promoting is just chained `git merge`s following the repo convention: `git checkout pre && git merge dev --no-ff -m "merge: promote dev to pre" && git push`, then `git checkout main && git merge pre --no-ff -m "merge: promote pre to main" && git push`, then back to `dev`. Use `--no-ff` to keep the explicit `merge: promote ...` commit. After promoting, the three branches must be at content parity — verify the tree hashes match (`git rev-parse origin/dev^{tree}` == `origin/pre^{tree}` == `origin/main^{tree}`). Local `main` can lag `origin/main` after a PR/API merge; `git fetch` and reset/pull before re-merging.
- Main branch: `main`.
- Before merging to `main`, run the explicit quality gate used by CI: `pnpm run db:generate`, then format check, lint, tests, builds, and `api-e2e`.
- If the workspace is not connected to Nx Cloud, do not leave `nxCloudId` in `nx.json`; it can break CI authorization.
- CI (`.github/workflows/ci.yml`) runs **only on push/PR to `main`** (pushes to `dev`/`pre` do not trigger it). To validate a change against CI without landing it on `main`, open a PR `dev → main` (CI also runs on `pull_request: [main]`).
- **`gh` CLI is installed and authenticated** (account `joancl99`, scopes `repo` + `workflow`; installed 2026-06-10 via winget). Use it to check the CI run after promoting (`gh run list --branch main --limit 3`, `gh run watch <id>`) and for PRs (`gh pr create` for the `dev → main` validation PR). If the current shell session predates the install and `gh` is not on PATH, call it by full path: `& "$env:ProgramFiles\GitHub CLI\gh.exe" ...` (PowerShell).
- After `pnpm install`, CI runs **`pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma`** before any tsc-based task. This is required: the schema lives at a non-default path, so `@prisma/client`'s install hook can't auto-generate it, and the API test/build suites need the generated enums/types (`Role`, `AuditAction`, `MovementType`, `InventoryCountStatus`, `Prisma.PrismaClientKnownRequestError`). Locally the client exists from running migrations, which masks the gap — run `pnpm run db:generate` after a fresh clone. The Docker API build already generates the client explicitly.
- Current CI commands (in order):
  - `pnpm install --frozen-lockfile`
  - `pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma`
  - `pnpm nx format:check --base=origin/main`
  - `pnpm nx run api:eslint:lint`
  - `pnpm nx lint web`
  - `pnpm nx run api-e2e:eslint:lint`
  - `pnpm nx test api`
  - `pnpm nx test web`
  - `pnpm nx build api`
  - `pnpm nx build web`
  - `pnpm nx e2e api-e2e`
  - `npx playwright install --with-deps chromium`
  - `pnpm nx e2e web-e2e`

(The lint step also runs `pnpm nx run web-e2e:eslint:lint`, and both e2e steps set `E2E_REDIS_URL=redis://localhost:6379/1` because CI's Redis service has no password.)

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
