# WarehouseApp

Full-stack inventory management system built as a portfolio project demonstrating enterprise-grade architecture across web and mobile platforms.

## Overview

WarehouseApp is a real-world inventory management solution that allows businesses to track stock, manage products, assign roles to users, and receive real-time low-stock alerts — all from a single codebase that runs on web and Android.

## Tech Stack

### Frontend
- **Angular 21** — standalone components, signal-based, SCSS
- **Ionic** — UI components optimized for mobile and web *(in progress)*
- **Capacitor** — native Android bridge (barcode scanning, camera, push notifications) *(in progress)*

### Backend
- **NestJS 11** — modular, enterprise-ready Node.js framework
- **PostgreSQL 16** — relational database
- **Prisma 6** — type-safe ORM with migrations
- **Redis 7** — refresh token storage (bcrypt-hashed), JWT invalidation
- **Socket.io** — real-time low-stock alerts via WebSockets *(in progress)*
- **MinIO** — S3-compatible local object storage for product images *(in progress)*

### Auth & Security
- JWT access tokens (15 min) + refresh tokens (7 days, Redis-backed with bcrypt rotation)
- Role-Based Access Control (RBAC): `ADMIN`, `MANAGER`, `OPERATOR`
- Two global `APP_GUARD`s: `JwtAuthGuard` → `RolesGuard`
- `@Public()` decorator bypasses JWT guard for open endpoints
- Helmet, CORS, global `ValidationPipe` (whitelist + transform)

### DevOps & Tooling
- **Nx 22** — monorepo manager with `affected` commands (only builds/tests what changed)
- **Docker Compose** — local environment (PostgreSQL, Redis, MinIO)
- **GitHub Actions** — CI/CD pipeline (format → lint → test → build on every PR)
- **OpenAPI / Swagger** — interactive API docs at `/api/docs`

### Testing
- **Jest** — unit and integration tests (NestJS services, guards, pipes)
- **Vitest** — unit tests for Angular (via `@angular/build`)
- **Cypress** — E2E tests for the Angular web app *(planned)*

---

## Features

### Core Inventory
- [x] Product catalog (name, SKU, category, price, stock, minStock)
- [x] Stock movements — INBOUND (+qty), OUTBOUND (-qty with validation), ADJUSTMENT (absolute value)
- [x] Full audit trail — every movement creates an `AuditLog` entry (same Prisma transaction)
- [ ] Low-stock threshold alerts (real-time via WebSocket + push notification)
- [ ] Barcode / QR code scanning via Capacitor on Android
- [ ] Product image upload (MinIO)

### Users & Roles
- [x] User registration and JWT authentication (register, login, refresh, logout)
- [x] Role-based permissions (ADMIN > MANAGER > OPERATOR) enforced globally
- [x] Audit log: who changed what and when (entity, action, before/after)

### Reporting
- [ ] Stock summary dashboard
- [x] Movement history with filters (productId, userId, type, date range, pagination)
- [ ] Export to CSV

### Developer Experience
- [x] Swagger UI at `/api/docs` with Bearer auth support
- [x] Shared TypeScript types between frontend and backend (`@warehouse/types`)
- [x] One-command dev environment (`npm run docker:up`)
- [ ] Pre-commit hooks (ESLint + Prettier via Husky)

---

## Monorepo Structure (Nx 22)

```
warehouse-app/
├── apps/
│   ├── api/                        # NestJS 11 backend
│   │   ├── prisma/
│   │   │   └── schema.prisma       # User, Category, Product, StockMovement, AuditLog
│   │   ├── src/
│   │   │   ├── app/                # AppModule (global guards wired here), AppController (/health)
│   │   │   ├── auth/               # JWT strategies, guards, decorators, AuthService, AuthController
│   │   │   │   ├── decorators/     # @Public(), @CurrentUser(), @Roles()
│   │   │   │   ├── dto/            # RegisterDto, LoginDto, AuthTokensDto
│   │   │   │   ├── guards/         # JwtAuthGuard, JwtRefreshGuard, RolesGuard
│   │   │   │   ├── strategies/     # jwt.strategy.ts, jwt-refresh.strategy.ts
│   │   │   │   └── types/          # JwtPayload, JwtRefreshPayload interfaces
│   │   │   ├── products/           # Full CRUD, soft-delete, lowStock post-filter
│   │   │   │   └── dto/            # CreateProductDto, UpdateProductDto, ProductQueryDto
│   │   │   ├── stock/              # Stock movements + audit log (atomic $transaction)
│   │   │   │   └── dto/            # CreateMovementDto, MovementQueryDto
│   │   │   ├── prisma/             # PrismaService (@Global), PrismaModule
│   │   │   ├── redis/              # RedisService (@Global, ioredis), RedisModule
│   │   │   ├── config/             # env.validation.ts (Joi — validates all vars at boot)
│   │   │   └── main.ts             # Helmet, CORS, prefix, ValidationPipe, Swagger bootstrap
│   │   ├── .env.example
│   │   └── project.json            # Nx targets: build, test, lint, prisma-*
│   ├── api-e2e/                    # NestJS integration/E2E tests (Jest)
│   └── web/                        # Angular 21 standalone app (SCSS, routing, Vitest)
│       └── src/
│           ├── app/                # AppComponent, app.routes.ts, app.config.ts
│           └── main.ts
├── libs/
│   └── shared/                     # @warehouse/types — shared DTOs and interfaces
│       └── src/
│           ├── index.ts
│           └── lib/types.ts
├── docker/
│   ├── docker-compose.yml          # PostgreSQL :5432, Redis :6379, MinIO :9000/:9001
│   └── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml                  # format → lint → test → build (nx affected)
├── .gitattributes                  # LF line endings enforced across platforms
├── eslint.config.mjs
├── jest.config.ts
├── nx.json
├── package.json
├── tsconfig.base.json              # paths: @warehouse/types → libs/shared/src/index.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 22
- Docker and Docker Compose
- Android Studio (optional, for mobile development)

### 1. Clone the repository

```bash
git clone https://github.com/joancl99/Warehouse.git
cd WarehouseApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure services

```bash
npm run docker:up
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **MinIO** on port `9000` (console UI at `9001`)

### 4. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
```

Key variables:

```env
DATABASE_URL="postgresql://warehouse:warehouse@localhost:5432/warehouse"
REDIS_URL="redis://:warehouse@localhost:6379"
JWT_ACCESS_SECRET="change-me-min-16-chars"
JWT_REFRESH_SECRET="change-me-min-16-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
CORS_ORIGIN="http://localhost:4200"
```

### 5. Run database migrations

```bash
npx nx run api:prisma-migrate
# When prompted, enter a migration name e.g. "init"
```

### 6. Start the applications

```bash
# API on http://localhost:3000  (Swagger at http://localhost:3000/api/docs)
npm run start:api

# Web on http://localhost:4200
npm run start:web
```

---

## Running the project

### First time

> Do this once after cloning the repository or on a fresh machine.

**1. Open Docker Desktop** and wait until the engine is running.

**2. Install dependencies**
```bash
npm install
```

**3. Create the environment file**
```bash
cp apps/api/.env.example apps/api/.env
```
The default values work out of the box for local development. No changes needed.

**4. Start infrastructure services**
```bash
npm run docker:up
```
Starts PostgreSQL `:5432`, Redis `:6379` and MinIO `:9000` in the background.

**5. Create the database tables**
```bash
npx dotenv -e apps/api/.env -- prisma migrate dev --schema=apps/api/prisma/schema.prisma --name init
```
This reads the Prisma schema and creates all tables in PostgreSQL.

**6. Start the API**
```bash
npm run start:api
```

API ready at `http://localhost:3000/api` — Swagger at `http://localhost:3000/api/docs`.

---

### Not the first time

> Every day when you want to work on the project.

**1. Open Docker Desktop** and wait until the engine is running.

**2. Start infrastructure services**
```bash
npm run docker:up
```

**3. Start the API**
```bash
npm run start:api
```

That's it. Data is persisted in Docker volumes so the database is exactly where you left it.

**To stop everything when you're done:**
```bash
# Ctrl+C in the API terminal
npm run docker:down
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run start:api` | Start NestJS API in dev/watch mode |
| `npm run start:web` | Start Angular web app in dev mode |
| `npm run build:api` | Production build of the API |
| `npm run build:web` | Production build of the web app |
| `npm test` | Run unit tests across all projects |
| `npm run lint` | Run ESLint across all projects |
| `npm run docker:up` | Start PostgreSQL, Redis and MinIO |
| `npm run docker:down` | Stop all Docker services |
| `npx nx run api:prisma-migrate` | Create and run a new migration |
| `npx nx run api:prisma-studio` | Open Prisma Studio (DB browser) |
| `npx nx run api:prisma-reset` | Reset DB and re-run all migrations |

---

## Running on Android

```bash
# Build the web app
npm run build:web

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## Testing

```bash
# Unit tests (all projects)
npm test

# Unit tests (single project)
npx nx test api
npx nx test web

# Only affected tests (CI mode)
npx nx affected -t test --base=origin/main

# E2E tests — NestJS integration
npx nx e2e api-e2e
```

---

## CI/CD Pipeline

GitHub Actions runs on every pull request and push to `main`.
Uses `nx affected` — only lints, tests and builds projects touched by the PR.

| Step | Command |
|------|---------|
| Format check | `nx format:check` |
| Lint | `nx affected -t lint` |
| Test | `nx affected -t test` |
| Build | `nx affected -t build --configuration=production` |

### Before merging to main

Always run these locally in `dev` before merging to avoid breaking CI:

```bash
npx nx format
npx nx affected -t lint --base=origin/main --head=HEAD
```

> **Note:** If `nx.json` has an `nxCloudId` field and the workspace is not connected to Nx Cloud, remove it — otherwise CI will abort with an authorization error.

---

## API Reference

Full interactive documentation is auto-generated by Swagger and available at `http://localhost:3000/api/docs` when the API is running.

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Login — returns access + refresh tokens | Public |
| `POST` | `/api/auth/refresh` | Rotate refresh token | Refresh token |
| `POST` | `/api/auth/logout` | Revoke refresh token from Redis | Bearer |

### Products

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/api/products` | List products (search, categoryId, lowStock, pagination) | All |
| `GET` | `/api/products/:id` | Get a product by ID | All |
| `POST` | `/api/products` | Create a product | ADMIN, MANAGER |
| `PATCH` | `/api/products/:id` | Update a product | ADMIN, MANAGER |
| `DELETE` | `/api/products/:id` | Soft-delete a product | ADMIN |

### Stock

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/api/stock/movements` | Record a stock movement (INBOUND / OUTBOUND / ADJUSTMENT) | All |
| `GET` | `/api/stock/movements` | List movements (productId, userId, type, dateFrom, dateTo, pagination) | All |
| `GET` | `/api/stock/movements/:id` | Get a movement by ID | All |

---

## Data Models

```
User          id, email, password, name, role (ADMIN/MANAGER/OPERATOR), refreshToken?, isActive
Category      id, name (unique)
Product       id, sku (unique), name, description?, price, stock, minStock, isActive, categoryId
StockMovement id, type (INBOUND/OUTBOUND/ADJUSTMENT), quantity, previousStock, newStock, notes?, productId, userId
AuditLog      id, entityType, entityId, action (CREATE/UPDATE/DELETE), changes (JSON), userId
```

All records include `createdAt` and `updatedAt` timestamps.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Client Layer                    │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Angular (Web)  │  │ Ionic + Capacitor│  │
│  │   :4200         │  │   (Android APK)  │  │
│  └────────┬────────┘  └────────┬─────────┘  │
└───────────┼────────────────────┼────────────┘
            │ HTTP / WebSocket   │
┌───────────▼────────────────────▼────────────┐
│              NestJS API  :3000               │
│                                              │
│  Global guards: JwtAuthGuard → RolesGuard    │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │   Auth   │ │ Products │ │    Stock    │  │
│  │  Module  │ │  Module  │ │   Module    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Prisma  │ │  Redis   │ │   MinIO     │  │
│  │  @Global │ │  @Global │ │  (storage)  │  │
│  └────┬─────┘ └────┬─────┘ └─────────────┘  │
└───────┼────────────┼────────────────────────┘
        │            │
┌───────▼──┐   ┌─────▼──┐
│PostgreSQL│   │ Redis  │
│  :5432   │   │  :6379 │
└──────────┘   └────────┘
```

---

## Roadmap

- [x] Project setup and architecture definition
- [x] Nx 22 monorepo (Angular 21 + NestJS 11 + `@warehouse/types` shared lib)
- [x] Docker Compose environment (PostgreSQL 16, Redis 7, MinIO)
- [x] GitHub Actions CI/CD (format → lint → test → build with `nx affected`)
- [x] NestJS API skeleton — ConfigModule (Joi), Swagger, global ValidationPipe, Helmet, CORS
- [x] Prisma 6 schema (User, Category, Product, StockMovement, AuditLog) + PrismaModule global
- [x] JWT authentication — register, login, refresh (Redis-backed + bcrypt rotation), logout
- [x] RBAC — `@Roles()` decorator + `RolesGuard` as second global `APP_GUARD`
- [x] Product CRUD — pagination, search, categoryId filter, lowStock filter, soft-delete
- [x] Stock movements — INBOUND/OUTBOUND/ADJUSTMENT with atomic Prisma transaction + AuditLog
- [ ] WebSocket gateway — real-time low-stock alerts (Socket.io)
- [ ] Angular + Ionic web application (product list, movement form, dashboard)
- [ ] Capacitor Android integration
- [ ] Barcode / QR scanning feature
- [ ] Product image upload (MinIO)
- [ ] E2E tests with Cypress
- [ ] Production Docker image

---

## License

MIT
