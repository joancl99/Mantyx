# WarehouseApp

Full-stack inventory management system built as a portfolio project demonstrating enterprise-grade architecture across web and mobile platforms.

## Overview

WarehouseApp is a real-world inventory management solution that allows businesses to track stock, manage products, assign roles to users, and receive real-time low-stock alerts — all from a single codebase that runs on web and Android.

## Tech Stack

### Frontend
- **Angular 21** — standalone components, signal-based, SCSS
- **Ionic** — UI components optimized for mobile and web
- **Capacitor** — native Android bridge (barcode scanning, camera, push notifications)

### Backend
- **NestJS 11** — modular, enterprise-ready Node.js framework
- **PostgreSQL 16** — relational database
- **Prisma** — type-safe ORM with migrations
- **Redis 7** — refresh token management, JWT blacklisting, caching
- **Socket.io** — real-time low-stock alerts via WebSockets
- **MinIO** — S3-compatible local object storage for product images

### Auth & Security
- JWT access tokens + refresh tokens (Redis-backed)
- Role-Based Access Control (RBAC): `ADMIN`, `MANAGER`, `OPERATOR`
- Global exception filters and request validation (`class-validator`)

### DevOps & Tooling
- **Nx 22** — monorepo manager with `affected` commands (only builds/tests what changed)
- **Docker Compose** — local environment (PostgreSQL, Redis, MinIO)
- **GitHub Actions** — CI/CD pipeline (lint, test, build on every PR using `affected`)
- **OpenAPI / Swagger** — auto-generated API documentation at `/api/docs`

### Testing
- **Jest** — unit and integration tests (NestJS services, guards, pipes)
- **Vitest** — unit tests for Angular (via `@angular/build`)
- **Cypress** — E2E tests for the Angular web app (planned)

---

## Features

### Core Inventory
- [ ] Product catalog (name, SKU, category, image, price, stock)
- [ ] Stock movements (inbound, outbound, adjustments) with full audit trail
- [ ] Low-stock threshold alerts (real-time via WebSocket + push notification)
- [ ] Barcode / QR code scanning via Capacitor on Android

### Users & Roles
- [ ] User registration and JWT authentication
- [ ] Role-based permissions (ADMIN > MANAGER > OPERATOR)
- [ ] Audit log: who changed what and when

### Reporting
- [ ] Stock summary dashboard
- [ ] Movement history with filters
- [ ] Export to CSV

### Developer Experience
- [x] Swagger UI at `/api/docs` (planned — endpoint ready)
- [x] Shared TypeScript types between frontend and backend (`@warehouse/types`)
- [x] One-command dev environment (`npm run docker:up`)
- [ ] Pre-commit hooks (ESLint + Prettier via Husky)

---

## Monorepo Structure (Nx 22)

```
warehouse-app/
├── apps/
│   ├── api/                    # NestJS 11 backend
│   │   ├── src/
│   │   │   ├── app/            # AppModule, AppController, AppService
│   │   │   └── main.ts
│   │   ├── .env.example
│   │   └── project.json
│   ├── api-e2e/                # NestJS integration/E2E tests (Jest)
│   └── web/                    # Angular 21 standalone app (SCSS, routing)
│       ├── src/
│       │   ├── app/            # AppComponent, app.routes.ts, app.config.ts
│       │   └── main.ts
│       └── project.json
├── libs/
│   └── shared/                 # @warehouse/types — shared DTOs and interfaces
│       └── src/
│           ├── index.ts
│           └── lib/types.ts
├── docker/
│   ├── docker-compose.yml      # PostgreSQL :5432, Redis :6379, MinIO :9000/:9001
│   └── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml              # lint → test → build (nx affected)
├── eslint.config.mjs
├── jest.config.ts
├── nx.json
├── package.json
├── tsconfig.base.json          # shared TS config (paths: @warehouse/types)
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
git clone https://github.com/your-username/warehouse-app.git
cd warehouse-app
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
JWT_ACCESS_SECRET="change-me"
JWT_REFRESH_SECRET="change-me"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
```

### 5. Run database migrations

> Requires Prisma to be set up first (see Roadmap).

```bash
npx nx run api:prisma-migrate
```

### 6. Start the applications

```bash
# API on http://localhost:3000  (Swagger at /api/docs)
npm run start:api

# Web on http://localhost:4200
npm run start:web
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run start:api` | Start NestJS API in dev mode |
| `npm run start:web` | Start Angular web app in dev mode |
| `npm run build:api` | Production build of the API |
| `npm run build:web` | Production build of the web app |
| `npm test` | Run unit tests across all projects |
| `npm run lint` | Run ESLint across all projects |
| `npm run docker:up` | Start PostgreSQL, Redis and MinIO |
| `npm run docker:down` | Stop all Docker services |

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

---

## API Reference

Full interactive documentation is auto-generated by Swagger and available at `/api/docs` when the API is running.

### Main endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/auth/register` | Register a new user | Public |
| `POST` | `/auth/login` | Login and get tokens | Public |
| `POST` | `/auth/refresh` | Refresh access token | Authenticated |
| `GET` | `/products` | List all products | All roles |
| `POST` | `/products` | Create a product | ADMIN, MANAGER |
| `PATCH` | `/products/:id` | Update a product | ADMIN, MANAGER |
| `DELETE` | `/products/:id` | Delete a product | ADMIN |
| `POST` | `/stock/movement` | Register stock movement | All roles |
| `GET` | `/stock/movements` | Movement history | All roles |
| `GET` | `/users` | List users | ADMIN |
| `PATCH` | `/users/:id/role` | Change user role | ADMIN |

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
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │   Auth   │ │ Products │ │    Stock    │  │
│  │  Module  │ │  Module  │ │   Module    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Prisma  │ │  Redis   │ │   MinIO     │  │
│  │  (ORM)   │ │ (Cache)  │ │  (Storage)  │  │
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
- [x] GitHub Actions CI/CD (lint → test → build with `nx affected`)
- [x] NestJS API skeleton — ConfigModule (Joi), Swagger, global ValidationPipe, Helmet, CORS
- [x] Prisma 6 schema (User, Category, Product, StockMovement, AuditLog) + PrismaModule global
- [x] JWT authentication — register, login, refresh (Redis-backed), logout, APP_GUARD global
- [ ] RBAC guards and decorators
- [ ] Product CRUD with image upload (MinIO)
- [ ] Stock movements and audit log
- [ ] WebSocket real-time alerts (Socket.io)
- [ ] Angular + Ionic web application
- [ ] Capacitor Android integration
- [ ] Barcode scanning feature
- [ ] E2E tests with Cypress
- [ ] Production Docker image

---

## License

MIT
