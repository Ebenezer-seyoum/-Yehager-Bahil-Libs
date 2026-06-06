# Phase 7 Cutover Readiness

This checklist starts Phase 7 and is used before production cutover.

## 1) Functional parity smoke checks

- Run automated smoke runner:
  - `cd yehager-libs/backend`
  - PowerShell: `$env:BACKEND_API_URL="<backend-url>"; $env:FRONTEND_BASE_URL="<frontend-url>"; npm run smoke:phase7`
  - Optional admin checks:
    - set `$env:ADMIN_SMOKE_TOKEN="<admin-jwt>"` OR
    - set `$env:NEXTAUTH_SECRET`, `$env:AUTH_SHARED_JWT_ISSUER`, `$env:AUTH_SHARED_JWT_AUDIENCE` so the script can mint an admin smoke token.
- Customer auth: sign in/out and protected page redirects.
- Catalog flow: browse products, open product page, add to cart.
- Shared shell flow:
  - switch languages from desktop and mobile navigation
  - verify PWA install prompt behavior on one supported Android/Chrome device and iOS manual-install instructions
- Checkout flow:
  - Stripe USD intent/session path.
  - ETB bank-transfer intent path.
- Account flow: create/update/delete measurements.
- Events flow: create event, join event, create family group, add members, assign products, add all to cart.
- Admin flow: orders dashboard, order detail updates, alerts resolution, audit visibility.

## 2) Operational checks

- Backend health endpoints:
  - `GET /health`
  - `GET /health/ready`
- Verify request IDs appear in backend logs for normal and error requests.
- Verify admin-only API routes return `403` for non-admin tokens.

## 3) Data and payments checks

- Confirm `exchange_rates` has valid USD->ETB rate before ETB checkout.
- Validate Stripe webhook signature and idempotency path in staging.
- Validate audit rows are created for:
  - checkout intent creation
  - payment updates
  - admin order-state updates

## 4) Deployment and rollback checklist

- Deploy order: backend first, then frontend.
- Confirm database migrations completed with no pending drift.
- Rollback policy:
  - app rollback allowed
  - DB forward-fix for production issues (no destructive down migration).

## 5) Sign-off

- [ ] Product/catalog owner sign-off
- [ ] Payments sign-off
- [ ] Admin operations sign-off
- [ ] Final cutover approval
