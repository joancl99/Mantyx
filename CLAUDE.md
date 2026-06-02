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
- Inventory counts: tenant-scoped count list/detail, create, start, complete, line add/update/delete.
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
- Inventory counts: list, filters, creation modal, detail, line editing, start/complete actions, completed read-only state.

## Current Frontend Architecture

- Feature containers are being kept lean by extracting list/filter/modal/detail components where practical.
- Inventory has feature-local `data-access`, `models`, status helpers, list, filters, create modal, and detail components.
- Warehouses has shared frontend models in `core/models/warehouse.models.ts` and child components for breadcrumb, warehouse list, and sublevel list.
- Products has shared frontend models in `core/models/product.models.ts` and child components for filters, list, form modal, and delete modal.
- Stock and movements use shared stock models in `core/models/stock.models.ts`; stock has a list/pagination child component, and movements has filter, list, and create modal components.
- Dashboard has shared frontend models in `core/models/dashboard.models.ts`; `DashboardService` should remain HTTP-focused.
- Admin has shared frontend models in `core/models/user.models.ts` and `core/models/company.models.ts`, plus child components for company list, users panel, and catalog panel.
- `core/services` should remain HTTP/service focused; shared model/DTO types should live in `core/models` or feature-local `models`.

## Remaining Product Focus

- Inventory counts are implemented and hardened with service unit tests under `apps/api/src/inventory`.
- Inventory lines are unique per `(inventoryCountId, locationId)` via Prisma schema and migration `20260602142000_inventory_line_location_unique`.
- Continue adding tests for stock, products, and warehouses; optional Inventory follow-up is cancel support for `CANCELLED` counts.
- Continue frontend cleanup where useful, especially remaining large pages and shared SCSS growth.

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
