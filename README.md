# PantryIQ

A pantry-aware nutrition app that turns grocery **receipts into a live inventory**,
watches it deplete as you cook, **rebuilds your shopping list** automatically, and
coaches you toward higher-protein, balanced meals. Built on a multi-agent backend.

This repo implements **Phase 0 (the reliable loop)** from the PRD:
receipt scan → reviewed inventory → recipe/photo-assisted meal logging
(confirm-before-deduct) → auto shopping list → calories + protein tracking.

## Architecture

Monorepo (npm workspaces):

```
apps/
  api/   Node + Express + TypeScript, Prisma (SQLite), OpenAI GPT-4o agents
  web/   Next.js (App Router) web client
```

### Backend agents (`apps/api/src/agents`)
- **Receipt Parser** — GPT-4o vision reads a bill into line items (heuristic fallback offline).
- **Item Resolver** — maps raw strings → canonical `FoodEntity`, learns aliases.
- **Vision/Dish** — identifies a cooked dish + servings + ingredients (assistive only).
- **Nutrition** — computes macros/fibre and healthy, non-medical insights.

### Core services (`apps/api/src/services`)
- **Inventory** — append-only ledger of inflows/outflows with idempotency keys.
- **Shopping List** — rebuilds suggestions from low/out/expiring items + run-out velocity.

The pantry is a **two-sided ledger**: receipts are inflows, meals are outflows,
and the running balance drives the shopping list and nutrition views.

## Prerequisites
- Node.js 20+
- An OpenAI API key (optional — the app falls back to heuristics without one,
  but real receipt/dish parsing needs it).

## Setup

```bash
# 1. Install everything
npm install --workspace apps/api
npm install --workspace apps/web

# 2. Configure the API
#    apps/api/.env already exists; paste your key:
#    OPENAI_API_KEY=sk-...

# 3. Create + seed the database (SQLite)
cd apps/api
npx prisma migrate dev
cd ../..
```

The seed loads ~17 Indian-staple food entities, 3 curated recipes
(Dal Tadka, Paneer Bhurji, Veg Khichdi), and a little starter inventory.

## Run

```bash
# API (http://localhost:4000)
npm run dev:api

# Web (http://localhost:3000) — in a second terminal
npm run dev:web
```

Open http://localhost:3000.

## Install as an app (PWA)

The web app is a **Progressive Web App** — installable on PC and mobile, no app
store needed. It runs in its own window and the UI shell works offline.

**On PC (Chrome / Edge):** open the site, then click the **install icon** in the
address bar (or menu → "Install PantryIQ"). It opens as a standalone app.

**On Android (Chrome):** open the site → menu (⋮) → **Add to Home screen / Install app**.

**On iPhone (Safari):** open the site → Share → **Add to Home Screen**.

> Installability needs a secure origin. `http://localhost` counts as secure, so it
> installs locally. To install on your **phone**, the site must be reachable from
> the phone — either over your LAN (see below) or hosted over HTTPS.

### Use on your phone over Wi-Fi (same network)
1. Find your PC's LAN IP (e.g. `192.168.1.4`).
2. Set `apps/web/.env.local` → `NEXT_PUBLIC_API_URL=http://192.168.1.4:4000`.
3. Set `apps/api/.env` → `CORS_ORIGIN=http://192.168.1.4:3000`.
4. Start both with host binding: `npm run dev:web -- -H 0.0.0.0` and run the API.
5. On your phone, open `http://192.168.1.4:3000` and install.

### Host it online (works anywhere)
Deploy the two apps and point the web app at the hosted API:
- **Web** → any static/Node host (Vercel, Netlify, a VPS). Set `NEXT_PUBLIC_API_URL`
  to the public API URL at build time.
- **API** → a Node host (Railway, Render, Fly.io, a VPS). Set `CORS_ORIGIN` to the
  web app's public origin, and move from SQLite to Postgres for production.
- Serve both over **HTTPS** so the PWA installs on iOS/Android.

## Key API endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/receipts/upload` | Upload + parse a receipt image |
| POST | `/api/receipts/:id/commit` | Commit reviewed lines as inflows |
| GET  | `/api/inventory` | Current pantry balances + run-out estimates |
| POST | `/api/inventory/reconcile` | Pantry-check correction |
| POST | `/api/meals` | Log a meal (recipe or ingredients) → deduct + nutrition |
| POST | `/api/meals/suggest` | Photo → dish suggestion (no deduction) |
| GET  | `/api/recipes/cookable` | "Cook with what I have", ranked |
| GET  | `/api/shopping` | Auto-rebuilt shopping list |
| GET  | `/api/household/nutrition` | Dashboard: today/week totals, trend, insights |

## Notes & roadmap
- Photo logging is **assistive** (confirm-before-deduct), per PRD §6 — photo-only
  auto-deduction is a deferred Phase 3 goal gated on measured accuracy.
- SQLite is used for zero-setup local dev; the schema maps cleanly to Postgres +
  `pgvector` (PRD recommendation) when scaling.
- Nutrition coaching is wellness guidance, **not medical advice**.
- PWA assets: `app/manifest.ts`, `public/sw.js`, icons in `public/icons/`
  (regenerate with `node apps/web/scripts/generate-icons.mjs`).

See `PantryIQ PRD v0_1.md` for the full product spec.
