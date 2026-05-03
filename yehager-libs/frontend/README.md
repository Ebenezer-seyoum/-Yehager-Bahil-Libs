# Yehager Frontend (Wave 1 Auth.js contract)

This folder currently contains the Auth.js token-minting contract needed for the separate backend service.

## Goal

When the frontend calls backend endpoints, it should send:

`Authorization: Bearer <backendAccessToken>`

Where `backendAccessToken` is signed with the shared `NEXTAUTH_SECRET` and includes:

- `iss = AUTH_SHARED_JWT_ISSUER`
- `aud = AUTH_SHARED_JWT_AUDIENCE`
- `sub = user.id`
- `email`, `role`

## Files

- `src/auth.config.ts`: Auth.js callback shape to preserve role/email in JWT/session.
- `src/lib/backend-token.ts`: Mints short-lived backend API token.
- `src/lib/api-client.ts`: Fetch helper for Hono backend API using minted token.

## Required env vars

- `NEXTAUTH_SECRET`
- `AUTH_SHARED_JWT_ISSUER`
- `AUTH_SHARED_JWT_AUDIENCE`
- `BACKEND_API_URL`
