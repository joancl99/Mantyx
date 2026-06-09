# Mantyx Project Context

Mantyx is a full-stack inventory and WMS SaaS application. The product name is **Mantyx** and the slogan is **"Precisión para tu almacén"**.

This document is the versioned project context for humans and coding agents. Use it together with `CLAUDE.md`, which contains the shorter operational rules.

## Product Vision

Mantyx is designed as an enterprise-style warehouse management SaaS for portfolio and interview purposes. The project should demonstrate practical production architecture rather than experimental complexity.

Core product areas:

- Multi-tenant company isolation.
- Role-based access control.
- Product catalog management.
- Stock by warehouse location.
- Movement tracking and auditability.
- Warehouse structure: warehouses, zones, aisles, and locations.
- Dashboard KPIs and operational alerts.
- Inventory counts by location.
- Inbound receptions and outbound expeditions.
- Barcode/QR scanning for warehouse operations.

## Branding

- Official name: Mantyx.
- Slogan: "Precisión para tu almacén".
- Use Mantyx consistently in user-facing text, headings, and current product documentation.
- The GitHub repository URL can still include legacy naming.

## Stack

- Monorepo: Nx 22.7.x.
- Frontend: Angular 21 standalone components, Ionic 8.8.7, SCSS, socket.io-client.
- Mobile runtime: Capacitor 8.3.4 (`capacitor.config.ts` at workspace root, `webDir = dist/apps/web/browser`).
- Barcode scanning: `@capacitor-mlkit/barcode-scanning` 8.1.0 (ML Kit native), `@zxing/browser` 0.2.0 (web fallback).
- Backend: NestJS 11, TypeScript.
- Database: PostgreSQL 16.
- ORM: Prisma 6.19.3.
- Cache/Auth: Redis 7.
- Local infrastructure: Docker Compose.
- API documentation: Swagger at `/api/docs` when the API is running.

## Multi-Tenancy

Mantyx is a SaaS with platform-level and tenant-level responsibilities.

Roles:

- `SUPERADMIN`: platform owner. Can manage companies globally.
- `ADMIN`: tenant owner. Manages users, categories, and brands for their own company.
- `MANAGER`: operational supervisor.
- `OPERATOR`: warehouse operations user.
- `VIEWER`: read-only user.

Most business data belongs to a `Company` and must be scoped by `companyId`. Platform-level endpoints must be explicitly restricted to `SUPERADMIN`. The global `CompanyGuard` returns 403 (not 500) if an authenticated user without a `companyId` hits a tenant-scoped route; platform routes are marked `@AllowNoCompany`. Tenant-scoped controllers inject the company via the `@CompanyId()` param decorator (guaranteed-non-null `string`) — there are no `user.companyId!` assertions.

Onboarding is invite-based (no public self-registration):

1. The first `SUPERADMIN` is created manually (Prisma Studio / SQL) with `companyId = null`.
2. The `SUPERADMIN` creates each company **together with its initial `ADMIN`** in one transactional step (`POST /companies` takes `adminName`/`adminEmail`/`adminPassword`).
3. Each `ADMIN` provisions their own workers via the Administración page (`POST /users`), assigning only `MANAGER`/`OPERATOR`/`VIEWER`.

## Implemented Backend Areas

- Auth: login, refresh, logout, JWT strategies, RBAC, throttling (no public registration — onboarding is invite-based). Throttling is a single default 120 req/min definition with a 10 req/min `@Throttle` override on the auth controller (multiple named `forRoot` definitions all apply to every route — avoid). Hardened (security audit 2026-06-07, fully addressed): access token (15m) carries a `jti`; logout stores it in a Redis denylist so it cannot be reused before expiry, and `JwtStrategy` re-fetches the live user every request (deactivation/role/company changes take effect immediately). The refresh token (7d) lives in an httpOnly + Secure + SameSite=strict cookie (never in the body/JS storage) and is keyed per device session at `refresh:<userId>:<sid>` in Redis, so concurrent device sessions coexist and logout/revocation target only the requesting session. Per-account login lockout (5 failures → 15-min Redis lock, 429). Upload magic-byte validation, JWT secret ≥32, Swagger off in prod, CORS URI validation. Strict CSP + security headers in `docker/nginx.conf`.
- Companies: `SUPERADMIN` company CRUD/toggle-status.
- Users: tenant user management.
- Categories: tenant-scoped catalog setup.
- Brands: tenant-scoped catalog setup.
- Products: CRUD, search, filters, pagination, soft delete. Search includes name, SKU, and barcode fields.
- Stock and movements: inbound, outbound, transfer, adjustment, return, movement history. `POST /stock/movements` requires ADMIN/MANAGER/OPERATOR (VIEWER is read-only). RETURN behaves as an inbound-style increment at the destination location. OUTBOUND/TRANSFER availability is decided atomically: the quantity guard lives inside the `updateMany` (`quantity >= requested` + matched-count check), so concurrent movements cannot drive stock negative. Stock entries are unique per `(productId, locationId)`.
- Stock movement creation validates that source/destination locations belong to the selected warehouse and company.
- Stock overview paginates in SQL; the low-stock filter and the dashboard KPI counters run as raw `GROUP BY/HAVING` aggregates (`SUM(quantity) <= minStock` is an aggregate-to-column comparison Prisma cannot express) instead of loading all tenant products into memory.
- Low-stock realtime: authenticated Socket.io gateway (`/ws` namespace). The handshake must carry a valid access token (revoked `jti` rejected against the Redis denylist); authenticated clients join a per-tenant `company:<id>` room and alerts are emitted only to the owning company's room — never broadcast globally.
- Performance indexes (migration `20260609192946`): movements by `(warehouseId, createdAt)`/product/user, stock entries and inventory lines by location, inventory counts by `(warehouseId, createdAt)`, users by company, products by category/brand, audit logs by `(companyId, createdAt)`/user. Postgres does not index FK columns automatically.
- Warehouses: warehouses, zones, aisles, locations.
- Inventory counts: tenant-scoped list/detail, creation, start, completion, and line add/update/delete flows.
- Dashboard: KPIs, alerts, latest movements.
- Common infrastructure: Prisma module, Redis module, global exception filter, Swagger bootstrap.

## Implemented Frontend Areas

- Auth pages: login only (no register — invite-based onboarding). Access token kept in memory only; the session is restored on load via a `provideAppInitializer` silent refresh. `AuthService.refresh()` shares a single in-flight request (`shareReplay` + `finalize` reset): the API rotates the refresh cookie per call, so parallel 401-triggered refreshes would present an already-rotated cookie and tear the session down.
- Authenticated shell with Ionic side menu and global scanner FAB (functional).
- Dashboard.
- Products.
- Stock (overview with debounced search and paginated list).
- Movements.
- Warehouses drill-down.
- Management: operational command center with stock health, replenishment risks, recent movements, and quick actions.
- Admin page with role-specific views:
  - `SUPERADMIN`: global company management.
  - `ADMIN`: tenant users, categories, and brands.
- Inventory counts: connected to the backend API with list, status filter, creation, detail, line editing, completion, and completed read-only handling. Scan-to-fill location: a "Escanear" button in the line form scans a location QR/barcode, resolves it via `GET /warehouses/:warehouseId/locations/search?code=`, and autofills the zone → aisle → location cascade.
- Receptions: full INBOUND flow with warehouse + cascading location (zone → aisle → location), multi-line form, scan-to-fill product by barcode/SKU, `forkJoin` parallel submit. Modal transitions to a success state after submit with an "Exportar albarán CSV" button.
- Expeditions: full OUTBOUND flow (mirror of Receptions), with source location and backend stock guard on submit error. Same modal success state with albarán CSV export.
- Receptions and Expeditions share a single config-driven modal `core/movement-modal/MovementFormModalComponent` (driven by a `MovementModalConfig`: labels, theme modifier class, header icon, id prefix, CSV wording). It emits a generic `MovementSubmitData`; each page maps the location to `toLocationId`/`fromLocationId` by direction. Green (reception) / red (expedition) theming via `.modal--reception`/`.modal--expedition` modifiers.
- Barcode/QR scanner: `ScannerService` with platform detection. ML Kit on native Android/iOS via Capacitor. ZXing camera overlay on browser/web. Integrated in the global FAB, the shared movement modal (receptions/expeditions), and the inventory line form.
- CSV export: `CsvExportService` (BOM prefix, RFC-4180 escaping, timestamped filename). Export button in every list page (Stock, Movements, Receptions, Expeditions) that exports with the currently active filters at `limit: 9999`.
- Product images: `PATCH /products/:id/image` (Multer diskStorage, jpg/png/webp ≤5 MB, UUID filename). Stored in `uploads/products/`, served as static assets. Image picker with live FileReader preview in the product form modal.
- Realtime low-stock alerts: `SocketService` connects on shell init with the current access token (now verified server-side — unauthenticated sockets are disconnected and alerts arrive only for the user's own company), subscribes to `low-stock` Socket.io events, and shows an Ionic warning toast (5 s, dismissible). `LowStockAlert` model aligned with backend `LowStockPayload` field names.
- Change detection: the 22 presentational child components (lists, filters, modals, panels) declare `ChangeDetectionStrategy.OnPush` — they hold no local mutable state (signal inputs/outputs only). Smart container pages keep default CD.
- Production Docker: `Dockerfile.api` is a 3-stage build on Node 24 Alpine (`builder` → `prod-deps` → `runner`). The builder runs `pnpm nx prune api`, emitting a pruned + frozen manifest pair (`dist/apps/api/package.json` + `pnpm-lock.yaml`) derived from the root lockfile; `prod-deps` installs only the API's runtime deps with `pnpm install --frozen-lockfile --prod` (reproducible, no Angular/Capacitor in the image). The pruned dep list lives in `apps/api/package.json`, kept in sync by the `@nx/dependency-checks` ESLint rule. `Dockerfile.web` builds Angular and serves it with `nginx:stable-alpine-slim`. Images are hardened (web 0 critical / 0 high, api 0 critical / 1 high CVEs); `.dockerignore` excludes `.env*` so local secrets never enter build layers. `docker-compose.prod.yml` orchestrates postgres + redis + api + web with a named volume for uploaded images. Nginx proxies `/api`, `/uploads`, and `/ws` (WebSocket upgrade) to the API container. The API entrypoint runs `prisma migrate deploy` before starting the process. MinIO removed — no longer referenced anywhere.

## Current Architecture Notes

- Frontend refactor commits have split large Inventory, Warehouses, Products, Movements, Admin, Receptions, and Expeditions pages into smaller standalone child components.
- Admin orchestration lives in feature-local state classes (`admin-catalog-state.ts`, `admin-users-state.ts` / `AdminUsersState`, `admin-companies-state.ts` / `AdminCompaniesState`), keeping `admin.component.ts` a thin coordinator (~140 lines). The admin modals are extracted into child components: `admin-user-modal`, `admin-company-modal`, the shared `admin-catalog-modal` (categories/brands, typed against a narrow `CatalogModalState` interface), and the shared `admin-confirm-dialog` (toggle/delete confirmations, content-projected body, `cancelled`/`confirmed` outputs). `admin.component.html` is now just `@if` guards hosting them.
- Shared frontend model/DTO types live in `apps/web/src/app/core/models` for products, stock/movements, warehouses, users, companies, and dashboard data.
- `StockLocationEntry` and `StockByProductResponse` are typed interfaces in `core/models/stock.models.ts`.
- Inventory keeps feature-specific data access and models under `apps/web/src/app/features/inventory/data-access` and `apps/web/src/app/features/inventory/models`.
- Inventory line location selector state has been extracted to feature-local `inventory-line-location-state.ts`.
- Products list/filter/pagination/search state has been extracted to feature-local `products-list-state.ts`.
- Movements list/filter/pagination state has been extracted to feature-local `movements-list-state.ts`.
- Receptions list/filter/pagination state lives in feature-local `receptions-list-state.ts` (always sends `type: 'INBOUND'`).
- Expeditions list/filter/pagination state lives in feature-local `expeditions-list-state.ts` (always sends `type: 'OUTBOUND'`).
- `apps/web/src/styles/_shared.scss` contains shared page headers, buttons (`.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-clear`, `.btn-export`), `.page-header__actions`, filters, modals, modal success state (`.modal-success`, `.success-icon`, `.success-title`, `.success-sub`, `.success-actions`), forms, empty states, pagination, `.input-with-scan`, and `.btn-scan`.
- `ScannerService` (`core/services/scanner.service.ts`) — `scan()` returns `Observable<ScanResult | null>`, uses `Capacitor.isNativePlatform()` to route to ML Kit or ZXing.
- `ScannerOverlayComponent` (`core/scanner/`) — ZXing camera overlay with animated crosshair, hosted by the shell. Its backdrop is an accessible button so template lint passes.
- The shared `MovementFormModalComponent` (used by Receptions and Expeditions) is smart: it injects `WarehousesService`, `ProductsService`, `ScannerService`, and `CsvExportService` directly. Scan-to-fill matches the barcode/SKU against the already-loaded products signal with no extra API call. It uses `CUSTOM_ELEMENTS_SCHEMA` so Ionic custom elements remain test-friendly in Angular/Vitest.
- Keep `core/services` focused on HTTP/service behavior; shared model/DTO types live under `core/models`. There are no `no-non-null-assertion` warnings in `apps/web`: form controls that feed a DTO after an `if (form.invalid) return` guard are `nonNullable: true`, and `editingId()`/`editingProduct()` are captured + narrowed with `mode === 'edit' && id !== null`.
- Management is a routed operational command center (not a placeholder).

## Testing And CI Status

- API unit suite is 65 tests across 10 suites: inventory, products, stock, dashboard, and warehouses service behavior plus auth/security (`auth.service.spec.ts` logout denylist + login lockout + per-session refresh, `jwt.strategy.spec.ts`, `company.guard.spec.ts` no-company 403, `image-signature.spec.ts` upload magic bytes, `stock-alerts.gateway.spec.ts` handshake auth + tenant rooms).
- Stock service tests include multi-tenant scoping, the atomic guarded source-location decrement (shape of the conditional `updateMany` + insufficient-stock rejection), required source/destination location validation, transfer validation, RETURN-as-increment semantics, inbound audit/alert behavior, DB-side overview pagination, and the raw low-stock SQL path. `dashboard.service.spec.ts` covers KPI/alert mapping from the SQL aggregates and empty-tenant defaults.
- API specs use `jest-mock-extended` with the shared helper `apps/api/src/testing/prisma-mock.ts` (`createPrismaMock()` + `row()`), so there is zero `any` in API specs or source. `src/testing/**` is excluded from the app build and the dep is test-only.
- Frontend unit suite is 10 tests across 4 spec files: app route smoke behavior, `roleGuard`, the shared `MovementFormModalComponent` data loading + submit validation, and `auth.service.spec.ts` (shared in-flight refresh: single request for concurrent callers, reset after settle, shared error propagation).
- `api-e2e` is a deterministic in-process Nest e2e test for `/api/health`; it listens on a dynamic port and closes itself after the suite. It no longer depends on `api:serve`, `global-setup`, `global-teardown`, or `test-setup`.
- The unused `types`/`libs/shared` Nx project was removed; the Nx projects are now `api`, `api-e2e`, and `web`. CI runs explicit full quality gates (no affected-only): format check, lint for `api`/`web`/`api-e2e`, tests for `api`/`web`, builds for `api`/`web`, and `api-e2e`.
- CI (`.github/workflows/ci.yml`) runs **only on push/PR to `main`** (not on `dev`/`pre`). After install it runs `pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma` before any tsc-based task — required because the schema is at a non-default path so `@prisma/client`'s install hook can't auto-generate the client, and the API test/build need the generated enums/types. After a fresh clone, run `pnpm run db:generate` locally for the same reason. To validate a change against CI without landing it on `main`, open a PR `dev → main`.
- Lint is clean: `api` is warning-free (the `@CompanyId()` decorator removed all 50 `no-non-null-assertion` warnings) and `web` is warning-free (the 45 `no-non-null-assertion` warnings + last stray `any` were cleared).

Remaining work (next session first — all four agreed with the product owner on 2026-06-09, in this order):

1. **Movements page → TRANSFER-only creation flow (next session).** Product decision: Movements exists to move stock between locations, never to add/subtract it (Receptions/Expeditions own inbound/outbound). The current "Nuevo movimiento" modal is broken — it never sends `fromLocationId`/`toLocationId` and the backend requires them, so every submit returns 400. Agreed UX: pick product → origin from the product's stock entries (`GET /stock/by-product/:id`, shows location + available qty, implies the warehouse) → destination via zone→aisle→location cascade in the same warehouse → quantity (max = origin qty) + notes → submit `type: 'TRANSFER'` with `warehouseId` derived from the origin entry. Remove the broken `MOVEMENT_FORM_TYPES`; backend should also reject `fromLocationId === toLocationId`.
2. **Auditoría page for ADMIN (next session).** `AuditLog` is write-only today (movements + inventory completion only; no read endpoint; `AuditAction.LOGIN/LOGOUT/CREATE/DELETE` unused). Build a global `AuditModule` (`AuditService.log()` must never break the business operation), `GET /audit` (`@Roles(ADMIN)`, company-scoped, action/entityType filters + pagination — the `(companyId, createdAt)` index already exists), broaden writes to auth LOGIN/LOGOUT and products/users CREATE/UPDATE/DELETE (never store passwords in `changes`), and an `admin-audit-panel` + `admin-audit-state.ts` inside Administración (ADMIN view), following the existing panel/state pattern.

3. **OnPush for the smart container pages (next session).** The 22 presentational children already declare it; extend `ChangeDetectionStrategy.OnPush` to the container pages. They are signal-based but each needs individual verification (reactive forms, Ionic overlays) — change + manual smoke per page.
4. **Socket reconnect with a fresh token (next session).** After a server-side disconnect, socket.io retries with the stale `auth.token` from the original handshake; `SocketService` must feed reconnect attempts the current access token so realtime alerts survive token expiry.

Then:

- Optional: cancel support for `CANCELLED` inventory counts.
- Expand API e2e beyond health: auth login/refresh, tenant-scoped product CRUD, stock movement guards, and inventory lifecycle.
- Add broader frontend unit tests: scanner service/overlay, CSV export, stock/movements services, products modal image handling, and inventory create/detail behavior.
- Consider Cypress or Playwright e2e coverage for browser flows: login, product creation, reception, expedition, inventory count lifecycle, and role-restricted navigation.

## Current Priority

- All main product areas are implemented: inventory counts (with scan-to-fill location), receptions, expeditions, barcode scanner, CSV export, product images, realtime alerts, and production Docker.
- The security audit (2026-06-07), the code-quality refactor passes (2026-06-08/09), and the full-project audit pass (2026-06-09, 4 commits on `dev`) are complete: auth/session hardening, `@CompanyId()` decorator, unified movement modal, extracted admin states/modals, RBAC on stock movements, authenticated per-tenant WS gateway, RETURN semantics, atomic stock decrements, sane throttling, shared frontend refresh, 13 DB indexes, SQL-side overview/dashboard aggregates, OnPush presentational children, and the dead `users.refreshToken`/`ProductVariant` schema removed.
- Quality baseline is in place: 65 API + 10 web unit tests, in-process API e2e, and explicit CI quality gates — all green.
- Next session: the four agreed items above, in order — TRANSFER-only movements modal, Auditoría page for ADMIN, OnPush on the smart container pages, and socket reconnect with a fresh token. After that: e2e coverage of real business flows and broader frontend unit tests.

## Visual Direction

- Dark slate/navy enterprise SaaS.
- Warm amber accent: `#f59e0b`.
- Primary font: Plus Jakarta Sans.
- Brand assets in `apps/web/public/brand/`: `mantyx-logo-full.png` (symbol + wordmark), `mantyx-symbol.png` (mantis only), `mantyx-wordmark.png` (text only). The wordmark is dark, so on the dark login card and side menu the logo sits on a white rounded "plate"/badge for legibility. Usage: login = full logo on a white plate; side menu = wordmark on a white plate; favicon = the green mantis symbol (`favicon.ico` 16/32/48 + `favicon-16x16.png`/`favicon-32x32.png`/`apple-touch-icon.png`, linked in `index.html`). Logos are plain `<img>` static assets (the `cube-sharp` ion-icon placeholder was removed).
- Ionic `IonMenu` for authenticated navigation.
- Scanner is a global FAB (bottom-right, barcode icon), not a menu section.
- Avoid futuristic, neon, holographic, or 3D effects.
- Do not use Inter, Roboto, or Arial as the primary brand font.

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

Every Angular component must use three files:

- `name.component.ts`
- `name.component.html`
- `name.component.scss`

Rules:

- Use `templateUrl` and `styleUrl` in component decorators.
- Do not use inline `template` or inline `styles`.
- Put shared CSS patterns in `apps/web/src/styles/_shared.scss`.
- Keep component SCSS specific to that component.

## Tooling Rules

- Use `pnpm` for installs and dependency restoration.
- Do not run `npm install`.
- The workspace declares `packageManager: pnpm@11.5.0`; if `pnpm` is not on PATH, use Corepack (`corepack pnpm ...`) or enable it locally. On Windows, `corepack enable` can require an Administrator shell.
- Prefer `pnpm nx ...` for direct Nx commands.
- Package scripts call local Nx directly and should be run through `pnpm`.
- Project skills are managed with `npx autoskills`; installed skills are locked in `skills-lock.json`.
- Use Prisma 6. Do not upgrade to Prisma 7 without a migration plan.
- If adding Prisma dependencies, pin to `prisma@^6` and `@prisma/client@^6`.

Windows Prisma migration command:

```bash
npx dotenv -e apps/api/.env -- prisma migrate dev --schema=apps/api/prisma/schema.prisma --name <migration-name>
```

Apply committed migrations to an existing database with:

```bash
npx dotenv -e apps/api/.env -- prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

## Native Mobile Build

Capacitor is configured and packages are installed. To build for Android:

```bash
pnpm nx build web --configuration=production
npx cap add android        # first time only — creates android/ directory
npx cap sync               # copies built web assets + plugins to native dirs
# then open android/ in Android Studio
```

For iOS, run `npx cap add ios` and `npx cap sync` on macOS with Xcode installed.

Required native permissions (add after `cap add`):

- Android `AndroidManifest.xml`: `<uses-permission android:name="android.permission.CAMERA" />`
- iOS `Info.plist`: `NSCameraUsageDescription` key with camera usage description.

## Repository

- Remote: `https://github.com/joancl99/Mantyx.git`.
- Main branch: `main`.
- **Three-branch promotion flow `dev → pre → main`** (development → pre-prod/staging → production). All work lands on `dev`; promoting to `pre`/`main` is done only on request via chained `--no-ff` merges (`merge: promote dev to pre`, then `merge: promote pre to main`), each pushed in turn. After promoting, the three branches sit at content parity (matching tree hashes — only the merge commits differ). CI runs only on `main`, so validate a change with a PR `dev → main` before promoting if in doubt.
- Before merging to `main`, run the same explicit quality gate as CI: `pnpm run db:generate`, then format check, lint, tests, builds, and `api-e2e`.
- Do not leave `nxCloudId` in `nx.json` unless the workspace is connected to Nx Cloud.
