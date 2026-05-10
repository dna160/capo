# Storytellers O2O Engine — Setup Guide

## Monorepo Structure

```
/
├── app/                    Consumer landing page (Vite + React)
├── apps/
│   ├── api/                Fastify backend (all API endpoints)
│   └── dashboard/          Next.js admin dashboard
├── packages/
│   └── db/                 Prisma schema + shared types
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL database (Railway provides this)
- Redis (Railway provides this)
- Google OAuth credentials

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Environment Variables

Copy `.env.example` to `.env` in each app:

```bash
cp apps/api/.env.example apps/api/.env
cp app/.env.example app/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

Fill in all values. Critical ones:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — 32+ random chars
- `AES_KEY` — 64-char hex string (32 bytes): `openssl rand -hex 32`
- `HMAC_SECRET` — random string for QR signature verification
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

## 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (creates all tables)
pnpm db:migrate

# Seed the first admin account
cd apps/api
ADMIN_EMAIL=admin@storytellers.id ADMIN_PASSWORD=YourPassword123 pnpm db:seed-admin
```

## 4. Run Locally

```bash
# API (port 8080)
pnpm dev:api

# Consumer landing page (port 5173)
pnpm dev:web

# Admin dashboard (port 3001)
pnpm dev:dashboard
```

## 5. Google OAuth Setup

In Google Cloud Console:
1. Create OAuth 2.0 credentials
2. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (dev)
   - `https://your-domain.com/auth/callback` (prod)

## 6. QR Code Format

QR codes embedded in carton packaging must encode a URL:

```
https://your-domain.com/?c={campaign_id}&uid={carton_uid}&sig={hmac_signature}
```

Where `sig = HMAC-SHA256(carton_uid, HMAC_SECRET)`.

carton_uid format: `{SKU_PREFIX}-{serial_number}`
- Battle Choco: `BC-000123456`
- Strawberry Blast: `SB-000123456`
- Full Cream Finisher: `FC-000123456`

## 7. Railway Deployment

Create 3 Railway services from the same repo, each pointing to:
- **API**: Root directory `/`, Start command from `apps/api/railway.json`
- **Web**: Root directory `/`, Start command from `app/railway.json`
- **Dashboard**: Root directory `/`, Start command from `apps/dashboard/railway.json`

Add Railway PostgreSQL and Redis plugins to the API service. Railway automatically provides `DATABASE_URL` and `REDIS_URL`.

## 8. Admin Campaign Workflow

1. Login to dashboard at `/login`
2. Create campaign → status: DRAFT
3. Set reward config (tier thresholds, SKUs)
4. Upload vault CSVs (STANDARD + TIER_1/2/3 + VARIETY)
5. Upload batch mapping CSV
6. Verify vault status (all 5 partitions > 0)
7. Set status → ACTIVE (locks reward config)
8. Monitor in real time via dashboard

## 9. API Base URL

All endpoints: `https://your-api-domain.com/api/v1/`

Health check: `GET /health`

See PRD for full endpoint specification.
