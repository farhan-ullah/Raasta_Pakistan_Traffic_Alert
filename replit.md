# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Raasta Pakistan — Web (`artifacts/raasta-pakistan`)
Mobile-first React web app. Pakistani flag green theme (#01411C). Three user roles: public (view traffic map, browse offers, report incidents with photos), police (PIN login, post alerts, verify reports), merchants (post offers with QR). Uses Leaflet for maps.

### Raasta Pakistan — Mobile (`artifacts/raasta-mobile`)
Native Expo app (iOS/Android). Same green theme. 5-tab navigation: Map (MapView with incident markers), Traffic (filterable list), Report (camera+gallery, area picker), Police (PIN login + command center), Dashboard (stats + analytics). react-native-maps pinned at 1.18.0. Web preview uses a web fallback for MapView (mocked via metro.config.js resolver). EXPO_PUBLIC_DOMAIN env var set.

### API Server (`artifacts/api-server`)
Express backend. Police auth: HMAC-SHA256 tokens, 8-hour TTL. POLICE_PIN env var. Routes: /api/incidents, /api/auth/police/login, /api/auth/police/verify, /api/offers, /api/merchants, /api/dashboard.

## Key Env Vars
- `POLICE_PIN` — police officer access code (default: raasta2024)
- `SESSION_SECRET` — HMAC signing key for police tokens
- `EXPO_PUBLIC_DOMAIN` — dev domain for Expo API calls
