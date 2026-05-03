# Yehager Backend (Wave 1)

This folder contains the Wave 1 backend foundation for the migration:

- API framework: Hono
- Database: PostgreSQL
- Schema/migrations: Drizzle ORM
- Query builder: Kysely
- Auth compatibility target: Auth.js / NextAuth (separate frontend service)
- Storage: Cloudinary (signed uploads from backend)

## Implemented in Wave 1

- Bootstrapped Hono service with:
  - CORS
  - request-id context
  - centralized error handling
  - API versioning under `/api/v1`
- Added initial route skeletons:
  - `GET /health`
  - `GET /api/v1/auth/session` (Bearer token verification)
  - `GET /api/v1/products`
  - `POST /api/v1/uploads/sign` (admin role)
- Added PostgreSQL schema definitions mapped from `base44/entities/*`:
  - users, products, measurements, events, family_groups, family_members
  - cart_items, orders, event_participants, exchange_rates
  - audit_logs, system_alerts
- Added SQL baseline migration in `migrations/0000_wave1_init.sql`.
- Added Drizzle + Kysely clients.
- Added Cloudinary signed upload helper.
- Added repository/service layers for users and cart.
- Added staged-sync scaffold script (`src/scripts/sync-base44.ts`).

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Update credentials in `.env`.

3. Start dev server:

```bash
npm install
npm run dev
```

## Auth.js integration contract (separate frontend service)

Because frontend and backend are separate services, the Next.js/Auth.js service should mint a short-lived JWT for backend calls with:

- issuer: `AUTH_SHARED_JWT_ISSUER`
- audience: `AUTH_SHARED_JWT_AUDIENCE`
- subject: user id
- claims: `email`, `role`

The backend validates this token in `requireAuth` middleware.

### Expected API routes (current)

- `GET /health`
- `GET /api/v1/auth/session`
- `GET /api/v1/users/me`
- `POST /api/v1/users/me/sync`
- `GET /api/v1/products`
- `GET /api/v1/cart`
- `POST /api/v1/cart`
- `PATCH /api/v1/cart/:itemId`
- `DELETE /api/v1/cart/:itemId`
- `GET /api/v1/orders/me`
- `GET /api/v1/orders/me/:orderId`
- `POST /api/v1/orders/checkout-intent`
- `GET /api/v1/orders` (admin)
- `GET /api/v1/orders/:orderId` (admin)
- `POST /api/v1/payments/stripe/checkout-session`
- `POST /api/v1/payments/stripe/webhook`
- `POST /api/v1/uploads/sign` (admin role)

### Example Auth.js JWT callback shape (frontend service)

In your Next.js Auth.js config, include:

- `iss = AUTH_SHARED_JWT_ISSUER`
- `aud = AUTH_SHARED_JWT_AUDIENCE`
- `sub = user id`
- `email`, `role` claims

## Staged sync notes

Wave 1 creates schema + API skeleton only. During staged migration:

1. Export Base44 entities in batches to `data-sync/base44-export/*.json`.
2. Run `npm run sync:dry` to validate payload shape/counts.
3. Run `npm run sync:run` for idempotent inserts.
4. Run `npm run sync:parity` for counts parity between exports and DB.
5. Switch feature flags endpoint-by-endpoint.

## Checkout intent safety (Wave 1.3)

`POST /api/v1/orders/checkout-intent` is now write-safe:

- Loads selected cart items for the authenticated user.
- Recomputes unit pricing from active products server-side.
- Persists order + audit log inside a DB transaction.
- Returns normalized line items and computed totals.

## Payments safety (Wave 1.4)

- Stripe checkout session creation is tied to an existing pending Stripe order.
- Webhook processing is idempotent via `stripe_webhook_events` unique `event_id`.
- Payment transitions are constrained with a backend state-machine helper.

## Known note on "Kyselify"

The package name `kyselify` is not currently resolvable from npm in this environment.  
Wave 1 uses a typed Kysely DB interface directly. If you have a specific Kyselify package source, we can wire it in Wave 2.
