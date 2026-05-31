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

## Branding

- Official name: Mantyx.
- Slogan: "Precisión para tu almacén".
- Use Mantyx consistently in user-facing text, headings, and current product documentation.
- The GitHub repository URL can still include legacy naming.

## Stack

- Monorepo: Nx 22.7.x.
- Frontend: Angular 21 standalone components, Ionic 8.8.7, SCSS, socket.io-client.
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
- Products: CRUD, search, filters, pagination, soft delete.
- Stock and movements: inbound, outbound, transfer, adjustment, movement history.
- Low-stock realtime base: Socket.io gateway in the stock area.
- Warehouses: warehouses, zones, aisles, locations.
- Dashboard: KPIs, alerts, latest movements.
- Common infrastructure: Prisma module, Redis module, global exception filter, Swagger bootstrap.

## Implemented Frontend Areas

- Auth pages: login and register.
- Authenticated shell with Ionic side menu.
- Dashboard.
- Products.
- Stock.
- Movements.
- Warehouses drill-down.
- Management page.
- Admin page with role-specific views:
  - `SUPERADMIN`: global company management.
  - `ADMIN`: tenant users, categories, and brands.
- Inventory route and base components exist, but the full backend integration is still pending.

## Current Priority

The next major feature is inventory counts.

Prisma already includes:

- `InventoryCount` with `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- `InventoryCountLine` with expected quantity, counted quantity, difference, and a required `Location` relation.

Backend target:

- Add `apps/api/src/inventory/`.
- Import `InventoryModule` in `AppModule`.
- Implement tenant-scoped endpoints:
  - `GET /inventory`
  - `POST /inventory`
  - `GET /inventory/:id`
  - `PATCH /inventory/:id/start`
  - `PATCH /inventory/:id/complete`
  - `POST /inventory/:id/lines`
  - `PATCH /inventory/:id/lines/:lineId`
  - `DELETE /inventory/:id/lines/:lineId`

Frontend target:

- Connect the existing inventory route/components to the backend API.
- Support count list, status filter, creation, detail, line add/edit/delete, and complete action.
- Keep completed counts read-only.

## Visual Direction

- Dark slate/navy enterprise SaaS.
- Warm amber accent: `#f59e0b`.
- Primary font: Plus Jakarta Sans.
- Ionic `IonMenu` for authenticated navigation.
- Scanner should be a global action/FAB, not a normal menu section.
- Avoid futuristic, neon, holographic, or 3D effects.
- Do not use Inter, Roboto, or Arial as the primary brand font.

Approved main menu:

- Dashboard.
- Products.
- Stock.
- Movements.
- Inventory.
- Warehouses.
- Management.
- Administration.

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
- Use Prisma 6. Do not upgrade to Prisma 7 without a migration plan.
- If adding Prisma dependencies, pin to `prisma@^6` and `@prisma/client@^6`.

Windows Prisma migration command:

```bash
npx dotenv -e apps/api/.env -- prisma migrate dev --schema=apps/api/prisma/schema.prisma --name <migration-name>
```

## Repository

- Remote: `https://github.com/joancl99/Mantyx.git`.
- Main branch: `main`.
- Run formatting and affected lint before merging to `main`.
- Do not leave `nxCloudId` in `nx.json` unless the workspace is connected to Nx Cloud.
