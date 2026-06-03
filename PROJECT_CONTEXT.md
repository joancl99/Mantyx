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

Most business data belongs to a `Company` and must be scoped by `companyId`. Platform-level endpoints must be explicitly restricted to `SUPERADMIN`.

Fresh database bootstrap:

1. Create a `Company` in Prisma Studio or with a seed/script.
2. Assign the initial non-SUPERADMIN user to that company through `User.companyId`.
3. Log in again so the JWT contains the updated `companyId`.

## Implemented Backend Areas

- Auth: register, login, refresh, logout, JWT strategies, refresh tokens, RBAC, throttling.
- Companies: `SUPERADMIN` company CRUD/toggle-status.
- Users: tenant user management.
- Categories: tenant-scoped catalog setup.
- Brands: tenant-scoped catalog setup.
- Products: CRUD, search, filters, pagination, soft delete. Search includes name, SKU, and barcode fields.
- Stock and movements: inbound, outbound, transfer, adjustment, movement history. Source-location stock guards on outbound.
- Low-stock realtime base: Socket.io gateway in the stock area.
- Warehouses: warehouses, zones, aisles, locations.
- Inventory counts: tenant-scoped list/detail, creation, start, completion, and line add/update/delete flows.
- Dashboard: KPIs, alerts, latest movements.
- Common infrastructure: Prisma module, Redis module, global exception filter, Swagger bootstrap.

## Implemented Frontend Areas

- Auth pages: login and register.
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
- Inventory counts: connected to the backend API with list, status filter, creation, detail, line editing, completion, and completed read-only handling.
- Receptions: full INBOUND flow with warehouse + cascading location (zone → aisle → location), multi-line form, scan-to-fill product by barcode/SKU, `forkJoin` parallel submit. Modal transitions to a success state after submit with an "Exportar albarán CSV" button.
- Expeditions: full OUTBOUND flow (mirror of Receptions), with source location and backend stock guard on submit error. Same modal success state with albarán CSV export.
- Barcode/QR scanner: `ScannerService` with platform detection. ML Kit on native Android/iOS via Capacitor. ZXing camera overlay on browser/web. Integrated in the global FAB, Reception modal, and Expedition modal.
- CSV export: `CsvExportService` (BOM prefix, RFC-4180 escaping, timestamped filename). Export button in every list page (Stock, Movements, Receptions, Expeditions) that exports with the currently active filters at `limit: 9999`.
- Product images: `PATCH /products/:id/image` (Multer diskStorage, jpg/png/webp ≤5 MB, UUID filename). Stored in `uploads/products/`, served as static assets. Image picker with live FileReader preview in the product form modal.
- Realtime low-stock alerts: `SocketService` connects on shell init with the current access token, subscribes to `low-stock` Socket.io events, and shows an Ionic warning toast (5 s, dismissible). `LowStockAlert` model aligned with backend `LowStockPayload` field names.
- Production Docker: multi-stage `Dockerfile.api` (Node 22 Alpine builder → slim runner) and `Dockerfile.web` (Angular build → Nginx 1.27 Alpine). `docker-compose.prod.yml` orchestrates postgres + redis + api + web with a named volume for uploaded images. Nginx proxies `/api`, `/uploads`, and `/ws` (WebSocket upgrade) to the API container. The API entrypoint runs `prisma migrate deploy` before starting the process. MinIO removed — no longer referenced anywhere.

## Current Architecture Notes

- Frontend refactor commits have split large Inventory, Warehouses, Products, Movements, Admin, Receptions, and Expeditions pages into smaller standalone child components.
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
- `ScannerOverlayComponent` (`core/scanner/`) — ZXing camera overlay with animated crosshair, hosted by the shell.
- Reception and Expedition modals are smart: they inject `WarehousesService`, `ProductsService`, and `ScannerService` directly. Scan-to-fill matches the barcode/SKU against the already-loaded products signal with no extra API call.
- Keep `core/services` focused on HTTP/service behavior; shared model/DTO types live under `core/models`.
- Management is a routed operational command center (not a placeholder).

Remaining work:

- Main second-pass frontend container cleanup is complete for Admin, Warehouses, Inventory, Products, and Movements.
- Inventory scanner integration (scan location QR to auto-fill location selector) is deferred — requires a backend location-search-by-code endpoint.
- Optional: cancel support for `CANCELLED` inventory counts.
- Next roadmap items: Cypress e2e coverage, frontend unit tests.

## Current Priority

- All main product areas are implemented: inventory counts, receptions, expeditions, barcode scanner, CSV export, product images, realtime alerts, and production Docker.
- Next: Cypress e2e coverage and/or polishing individual pages.

## Visual Direction

- Dark slate/navy enterprise SaaS.
- Warm amber accent: `#f59e0b`.
- Primary font: Plus Jakarta Sans.
- Ionic `IonMenu` for authenticated navigation.
- Scanner is a global FAB (bottom-right, barcode icon), not a menu section.
- Avoid futuristic, neon, holographic, or 3D effects.
- Do not use Inter, Roboto, or Arial as the primary brand font.

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
- Run formatting and affected lint before merging to `main`.
- Do not leave `nxCloudId` in `nx.json` unless the workspace is connected to Nx Cloud.
