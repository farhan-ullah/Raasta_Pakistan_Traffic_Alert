# Raasta Pakistan (Traffic Alert)

**Raasta Pakistan** is a traffic and incidents platform aimed at Islamabad-style use cases: live road incidents on a map, citizen reports, police tools, and local merchant offers.

> **Note:** Despite the parent folder name `Flutter_Projects`, this codebase is **not** built with Flutter. It is a **TypeScript monorepo** using **pnpm**, **Express**, **PostgreSQL**, **React (Vite)**, and **Expo (React Native)**.

---

## Monorepo layout

| Piece | Path | Role |
|--------|------|------|
| **API server** | `artifacts/api-server` | REST backend + PostgreSQL |
| **Web app (Vite)** | `artifacts/raasta-pakistan` | Mobile-first browser UI (React + Leaflet) |
| **Mobile app (Expo)** | `artifacts/raasta-mobile` | iOS / Android / Expo web preview |
| **OpenAPI spec** | `lib/api-spec` | Source for codegen |
| **Generated Zod** | `lib/api-zod` | Request/response validation types |
| **Generated React Query client** | `lib/api-client-react` | `useListIncidents`, `useGetActiveMapIncidents`, etc. |
| **Database schema** | `lib/db` | Drizzle ORM + PostgreSQL |

---

## Tech stack

- **Monorepo:** pnpm workspaces  
- **Language:** TypeScript 5.9  
- **API:** Express 5  
- **Database:** PostgreSQL + Drizzle ORM  
- **Validation:** Zod (`zod/v4`), drizzle-zod  
- **API contract:** OpenAPI → Orval codegen for hooks and types  
- **Web:** Vite, React, Tailwind, Leaflet (`react-leaflet`), Wouter  
- **Mobile:** Expo 54, Expo Router, react-native-maps  

---

## How it works (architecture)

### Backend (`artifacts/api-server`)

- Express HTTP API mounted under `/api`.
- PostgreSQL accessed via Drizzle (`lib/db`).
- CORS enabled for browser and Expo clients.
- **Police auth:** PIN login (`POLICE_PIN`); returns a **token** signed/verified with **`SESSION_SECRET`** (HMAC-style helpers). Protected routes require that token.
- Route groups include: health, auth (`/api/auth/police/login`, `/api/auth/police/verify`), incidents, merchants, offers, dashboard (stats / activity).

**Flow:** JSON in → Zod-validated handlers (`@workspace/api-zod`) → Drizzle read/write → JSON out.

### Data model (incidents)

Incidents include: **type** (blockage, accident, congestion, VIP movement, etc.), **title/description**, **lat/lng**, **severity**, **status** (e.g. active/resolved), **reportedBy** (citizen vs police), **media URLs**, **verification**, **alternate routes**, **areas**, timestamps, and more. Map and list views are filtered queries over this data.

### API contract and shared clients

- `lib/api-spec/openapi.yaml` describes the HTTP API.
- Orval generates React Query hooks in `@workspace/api-client-react` and types in `@workspace/api-zod`.
- **`setBaseUrl()`** / env-based origin so the same hooks run in Vite and Expo.

### Web app (`artifacts/raasta-pakistan`)

- React + Vite, Tailwind, Leaflet for maps.
- Routes (Wouter): home map, traffic list, offers, merchants, police portal, dashboard, etc.
- **Dev:** `vite.config.ts` expects `PORT` and `BASE_PATH`. Use the `dev:local` script in that package for local defaults.

### Mobile app (`artifacts/raasta-mobile`)

- Expo Router with tab navigation: map, traffic, report (camera/gallery, area), police, dashboard.
- **react-native-maps** on native; web may use Metro-resolved fallbacks for map.
- Permissions (camera, location, notifications) are declared in `app.json`.

### Environment variables (clients)

- **Expo:** `EXPO_PUBLIC_API_ORIGIN` for local dev (e.g. `http://127.0.0.1:3000` or `http://10.0.2.2:3000` for Android emulator → host). Alternatively `EXPO_PUBLIC_DOMAIN` (hostname only) with `https://` for hosted deployments.
- **Vite:** ensure `PORT` and `BASE_PATH` are set (see `dev:local`).

### Environment variables (API)

- `DATABASE_URL` — PostgreSQL connection string  
- `PORT` — server listen port  
- `POLICE_PIN` — police officer PIN (e.g. default documented in deployment: `raasta2024`)  
- `SESSION_SECRET` — signing key for police tokens  

---

## User journeys

1. **Citizen:** Open web or app → see live incidents on map/list → submit reports (photos, area, type).
2. **Police:** Log in with PIN → receive token → post alerts, verify citizen reports, resolve incidents.
3. **Merchants / offers:** Browse and manage merchants and promotional offers (implementation depth varies by screen).
4. **Dashboard:** Summary stats and recent activity from the API (“command center” style view).

---

## Commands

All commands assume you are in the **repository root** unless a `cd` is shown. This repo declares `"packageManager": "pnpm@9.15.0"`. If the `pnpm` command fails (e.g. Corepack signature errors), prefix with **`npx`**:

```bash
npx pnpm@9.15.0 install
npx pnpm@9.15.0 run typecheck
```

You can also run package-local binaries with **`./node_modules/.bin/<name>`** after `pnpm install` (e.g. `./node_modules/.bin/expo` from `artifacts/raasta-mobile`).

### Workspace root (`package.json`)

| Command | Description |
|--------|-------------|
| `pnpm install` | Install all workspace dependencies (enforces pnpm only; removes `package-lock.json` / `yarn.lock`). |
| `pnpm run typecheck` | Typecheck shared libs (`tsc --build`) + all `artifacts/*` and `scripts` that define `typecheck`. |
| `pnpm run typecheck:libs` | Typecheck only the root TS project references. |
| `pnpm run build` | Runs `typecheck`, then `pnpm -r --if-present run build` in every package that has a `build` script. |

### API server — `@workspace/api-server` (`artifacts/api-server`)

Requires **`DATABASE_URL`** and **`PORT`** in the environment. Optional: `POLICE_PIN`, `SESSION_SECRET`.

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Sets `NODE_ENV=development`, **builds** the server, then **starts** it. |
| `pnpm --filter @workspace/api-server run build` | Bundle server with esbuild → `dist/`. |
| `pnpm --filter @workspace/api-server run start` | Run `node dist/index.mjs` (needs prior build). |
| `pnpm --filter @workspace/api-server run typecheck` | `tsc --noEmit` for the API package. |

Example (adjust port and DB URL):

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/raasta"
export PORT=3000
export POLICE_PIN="raasta2024"
export SESSION_SECRET="your-secret"
pnpm --filter @workspace/api-server run dev
```

**First-time database:** `GET /api/incidents` returns **503** (or fails) until tables exist.

- **Docker (Option A):** `docker compose up -d`, then `export DATABASE_URL="postgresql://raasta:raasta@localhost:5432/raasta"`, then **`pnpm run db:push`**.

- **Existing Postgres (Option B):** Set **`DATABASE_URL`** to a user and database that already exist (create an empty DB first if needed), e.g. `postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB`. On many Mac Homebrew installs, your macOS username is a valid role with no password: `postgresql://$(whoami)@localhost:5432/postgres`. Copy **`env.local.example`** to **`.env.local`**, edit **`DATABASE_URL`**, then run **`pnpm run db:push:local`** (or **`export DATABASE_URL=...`**, then **`pnpm run db:push`**). Use the **same** **`DATABASE_URL`** when starting the API.

After code changes to the API, run **`pnpm --filter @workspace/api-server run build`** (or `dev`, which builds) before `start` so `dist/` is up to date.

### Web app (Vite) — `@workspace/raasta-pakistan` (`artifacts/raasta-pakistan`)

`vite.config.ts` requires **`PORT`** and **`BASE_PATH`** (Replit-style). For local use, prefer **`dev:local`**, which sets them.

**Local API:** The Vite dev server **proxies `/api`** to **`http://127.0.0.1:3000`** by default (override with **`VITE_API_PROXY_TARGET`**). Start the API on that port (or change the env) so police login and data hooks work. Police PIN **`raasta2024`** is the default when the API runs with **`NODE_ENV=development`** and **`POLICE_PIN`** is unset.

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/raasta-pakistan run dev` | Vite dev server **only** if `PORT` and `BASE_PATH` are already set in the environment. |
| `pnpm --filter @workspace/raasta-pakistan run dev:local` | `PORT=5173` and `BASE_PATH=/` — local browser dev. |
| `pnpm --filter @workspace/raasta-pakistan run build` | Production build. |
| `pnpm --filter @workspace/raasta-pakistan run serve` | Preview production build (`vite preview`, needs `PORT` + `BASE_PATH` like `dev`). |
| `pnpm --filter @workspace/raasta-pakistan run typecheck` | `tsc --noEmit`. |

From inside the package directory:

```bash
cd artifacts/raasta-pakistan
pnpm run dev:local
```

App URL is typically **http://localhost:5173/** (with `dev:local`).

### Mobile app (Expo) — `@workspace/raasta-mobile` (`artifacts/raasta-mobile`)

Set **`EXPO_PUBLIC_API_ORIGIN`** for local API (e.g. `http://127.0.0.1:3000`). On **Android emulator** targeting the host machine, use **`http://10.0.2.2:3000`**. For hosted HTTPS APIs, use **`EXPO_PUBLIC_DOMAIN`** (hostname only) instead.

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/raasta-mobile run start` | `expo start` (interactive Metro; choose platform). |
| `pnpm --filter @workspace/raasta-mobile run android` | `expo start --android`. |
| `pnpm --filter @workspace/raasta-mobile run ios` | `expo start --ios`. |
| `pnpm --filter @workspace/raasta-mobile run web` | `expo start --web`. |
| `pnpm --filter @workspace/raasta-mobile run dev:local` | `EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:3000` + `expo start` (simulator / same machine only). |
| `pnpm --filter @workspace/raasta-mobile run dev:device` | Sets **`EXPO_PUBLIC_API_ORIGIN`** to your Mac’s LAN IP **:3000** and runs **`expo start --lan`** so a **physical phone** on Wi‑Fi can reach the API. Start the API on **:3000** first. |
| `pnpm --filter @workspace/raasta-mobile run android:native` | Native Android build: runs **`pnpm install` from the repo root**, then **`expo run:android`**. Requires **Android Studio / SDK** and typically **`export ANDROID_HOME=$HOME/Library/Android/sdk`** on macOS (the **`scripts/run-android.sh`** helper sets this if that folder exists). Set **`EXPO_PUBLIC_API_ORIGIN`** for a physical device (e.g. `http://192.168.x.x:3000`). Prefer this over bare **`npx expo run:android`** from the package folder alone, which often fails on the inner **`pnpm install`**. |
| `pnpm --filter @workspace/raasta-mobile run dev` | Replit-oriented env (`REPLIT_*`, `PORT`, etc.); use on Replit. |
| `pnpm --filter @workspace/raasta-mobile run build` | `node scripts/build.js` (deployment build). |
| `pnpm --filter @workspace/raasta-mobile run serve` | `node server/serve.js` (static/serve helper). |
| `pnpm --filter @workspace/raasta-mobile run typecheck` | `tsc --noEmit`. |

Direct **Expo CLI** (from `artifacts/raasta-mobile` after install):

```bash
cd artifacts/raasta-mobile
EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:3000 ./node_modules/.bin/expo start
EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:3000 ./node_modules/.bin/expo start --web
EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:3000 ./node_modules/.bin/expo start --android
EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:3000 ./node_modules/.bin/expo start --android
```

With Metro running, press **w** (web), **a** (Android), **i** (iOS).

### OpenAPI codegen — `@workspace/api-spec` (`lib/api-spec`)

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/api-spec run codegen` | Run **Orval** from `orval.config.ts` → regenerates `lib/api-client-react` and `lib/api-zod` outputs from `openapi.yaml`. |

### Database — `@workspace/db` (`lib/db`)

Requires **`DATABASE_URL`**.

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/db run push` | `drizzle-kit push` — apply schema to the database (dev workflow). |
| `pnpm --filter @workspace/db run push-force` | Same with `--force`. |

### Scripts package — `@workspace/scripts` (`scripts`)

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/scripts run hello` | Run `tsx ./src/hello.ts`. |
| `pnpm --filter @workspace/scripts run typecheck` | `tsc --noEmit`. |

### Mockup sandbox — `@workspace/mockup-sandbox` (`artifacts/mockup-sandbox`)

| Command | Description |
|--------|-------------|
| `pnpm --filter @workspace/mockup-sandbox run dev` | `vite dev`. |
| `pnpm --filter @workspace/mockup-sandbox run build` | `vite build`. |
| `pnpm --filter @workspace/mockup-sandbox run preview` | `vite preview`. |
| `pnpm --filter @workspace/mockup-sandbox run typecheck` | `tsc --noEmit`. |

### Recursive / all packages

| Command | Description |
|--------|-------------|
| `pnpm -r run typecheck` | Run `typecheck` in every package that defines it (may be broader than root `typecheck`). |
| `pnpm -r --if-present run build` | Run `build` wherever present (root `build` already runs typecheck first). |

---

## Design notes

- **Theme:** Pakistani flag green accent (`#01411C`) across web and mobile.
- **Security:** Supply-chain conscious `pnpm` settings in `pnpm-workspace.yaml` (minimum release age, etc.).

---

## Summary

This repository is a **full-stack traffic-alert product**: one **Postgres-backed Express API**, one **React + Vite web client**, and one **Expo mobile client**, sharing **generated API clients** from a single OpenAPI spec. It stores and serves traffic incidents (and related merchants/offers), shows them on **maps and lists**, and supports **police** and **citizen** workflows through authenticated and public endpoints.
