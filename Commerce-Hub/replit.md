# TradeRoute

## Overview

TradeRoute is a B2B e-commerce marketplace connecting four roles: shopkeepers (buyers), manufacturers (sellers), transporters (delivery), and admins (platform operators). Built as a pnpm monorepo with a React + Vite frontend, Express API backend, and PostgreSQL via Drizzle ORM.

## Stack

- **Monorepo tool**: pnpm workspaces, Node.js 24
- **Frontend**: React + Vite + wouter routing, TanStack Query, Tailwind, framer-motion, Zustand (cart), Recharts
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API contract**: OpenAPI spec → Orval-generated React Query hooks + Zod schemas
- **Auth**: Demo cookie-session — either pick a preset account on `/login`, or sign up / sign in with mobile number + OTP on `/signup` (OTP is shown as an in-app toast notification, no real SMS)

## Artifacts

- `artifacts/marketplace` — TradeRoute web app at `/`
- `artifacts/api-server` — API at internal port (mounted by reverse proxy)
- `artifacts/mockup-sandbox` — component preview sandbox (dev tool)

## Roles & Flow

- **Shopkeeper** — browses products, adds to cart (split per manufacturer at checkout), places orders, tracks shipments.
- **Manufacturer** — manages own product catalog; reviews incoming orders (accept/reject); assigns transporter to accepted orders.
- **Transporter** — sees assigned shipments; advances status: assigned → picked_up → in_transit → delivered.
- **Admin** — platform-wide overview: users, products, orders, shipments, GMV, revenue by category, role management.

## Demo Accounts (seeded)

All demo accounts use password **`demo1234`**. Sign in at `/signup` with the phone number + password.

| Role | Name | Phone |
|---|---|---|
| Shopkeeper | Kavya Reddy (Brightside General Store) | +14155550142 |
| Shopkeeper | Marcus Chen (Corner Mart Express) | +14155550188 |
| Manufacturer | Priya Sharma (Aurora Foods) | +14085550231 |
| Manufacturer | Daniel Okafor (Summit Goods Co.) | +15105550399 |
| Transporter | Riya Patel (Swift Route Logistics) | +16505550117 |
| Transporter | Carlos Rivera (Haul Line Freight) | +17075550264 |
| Admin | Alex Morgan (TradeRoute Operations) | +14155550001 |

Auth flow on `/signup`:
1. Enter phone → API checks if user has a password set
2. If **existing user with password** → password step → immediate login
3. If **existing user without password** → OTP step → auto-login (OTP shown as toast, no SMS)
4. If **new user** → OTP step → verify → details form (name, role, company, GSTIN, password) → account created

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — reset and seed demo data

## Key Files

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/db/src/schema/` — Drizzle schema (users, products, orders, order_items, shipments, sessions, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, products, orders, shipments, users, dashboard)
- `artifacts/api-server/src/lib/session.ts` — cookie-session helpers (`tr_session` cookie)
- `artifacts/api-server/scripts/seed.ts` — demo data seeder
- `artifacts/marketplace/src/` — frontend pages, components, role-aware layout
