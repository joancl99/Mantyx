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
- Dashboard: KPIs, alerts, and latest movements.
- Global exception filter, Prisma module, Redis module, Swagger bootstrap.

Frontend areas currently present:

- Auth pages: login/register.
- Shell with Ionic side menu.
- Dashboard.
- Products.
- Stock.
- Movements.
- Warehouses drill-down.
- Management.
- Admin: different views for `SUPERADMIN` and `ADMIN`.
- Inventory route/components exist, but the full inventory count backend module is still the next major focus.

## Next Major Feature

Inventory counts are the next priority.

Existing Prisma schema includes:

- `InventoryCount` with status `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- `InventoryCountLine` with expected quantity, counted quantity, difference, and required `Location` relation.

Backend still needs a functional `apps/api/src/inventory/` module and `AppModule` import if not already implemented. Expected endpoints:

- `GET /inventory` list counts by tenant with pagination/status filter.
- `POST /inventory` create a count for a warehouse.
- `GET /inventory/:id` count detail with lines.
- `PATCH /inventory/:id/start` move `DRAFT` to `IN_PROGRESS`.
- `PATCH /inventory/:id/complete` calculate differences and mark completed.
- `POST /inventory/:id/lines` add a line in `DRAFT` or `IN_PROGRESS`.
- `PATCH /inventory/:id/lines/:lineId` register `countedQty`.
- `DELETE /inventory/:id/lines/:lineId` remove a line only in `DRAFT`.

Frontend should connect the existing inventory area to that API and keep `COMPLETED` counts read-only.

## Visual Direction

- Theme: dark slate/navy enterprise SaaS.
- Accent: warm amber `#f59e0b`.
- Typography: Plus Jakarta Sans.
- Navigation: Ionic `IonMenu` side drawer for authenticated routes.
- Auth pages are full-screen and do not show the app menu.
- Scanner should be a global action button/FAB, not a regular menu section.
- Avoid futuristic, neon, holographic, or 3D visual effects.
- Do not use Inter, Roboto, or Arial as the primary brand font.
- Before building a new visual page from scratch, ask for a design reference if the direction is unclear.

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

## GitHub And CI

- Remote: `https://github.com/joancl99/Mantyx.git`.
- Main branch: `main`.
- Before merging to `main`, run formatting and affected lint from the development branch.
- If the workspace is not connected to Nx Cloud, do not leave `nxCloudId` in `nx.json`; it can break CI authorization.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

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

<!-- nx configuration end-->
