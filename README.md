# Expense Tracker

Personal expense tracker with bank accounts linked via [Plaid](https://plaid.com) — see spending by category, monthly totals, and income/credits across accounts.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 · Postgres · Plaid · NextAuth (Auth.js v5) · Recharts

## Local setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Database** — a dedicated dev Postgres runs in Docker (separate from any other project's database):

   ```bash
   docker run -d --name expense-tracker-postgres \
     -e POSTGRES_USER=expense_tracker -e POSTGRES_PASSWORD=devpassword \
     -e POSTGRES_DB=expense_tracker -p 5433:5432 postgres:16-alpine
   ```

   (Already running if you set this project up in this session — check with `docker ps`.)

3. **Environment variables** — copy `.env.example` to `.env.local` and fill in:
   - `PLAID_CLIENT_ID` / `PLAID_SECRET` — sign up free at [dashboard.plaid.com](https://dashboard.plaid.com), Sandbox keys are instant.
   - `TOKEN_ENCRYPTION_KEY`, `AUTH_SECRET`, `CRON_SECRET` — generate with `openssl rand -hex 32` / `openssl rand -base64 32`.
   - `AUTH_PASSWORD_HASH` — generate with `pnpm tsx scripts/hash-password.ts "your-password"`.
     **Escape every `$` as `\$` in this value** — Next.js's env loader does shell-style `$VAR` expansion on `.env` files and will silently corrupt an unescaped bcrypt hash.

   A `.env.local` with working defaults and a temporary login password already exists if this was set up in this session — check with your assistant for the temp password, then rotate it.

4. **Migrate and seed**

   ```bash
   pnpm db:migrate   # applies prisma/migrations
   pnpm db:seed      # seeds default categories
   ```

5. **Run**

   ```bash
   pnpm dev
   ```

   Visit http://localhost:3000, sign in, and use "Link a bank account" — in Sandbox mode, pick any institution and log in with Plaid's test credentials `user_good` / `pass_good`.

## Deploying to Vercel

1. Push this repo to GitHub, import it into Vercel.
2. Add a Postgres database via the Vercel Marketplace (Neon) — this sets `DATABASE_URL`.
3. Set all other env vars from `.env.example` in the Vercel project settings.
4. The build step runs `prisma generate && prisma migrate deploy && next build` automatically.
5. After the first deploy, set `PLAID_WEBHOOK_URL` to `https://<your-domain>/api/plaid/webhook` and redeploy.
6. `vercel.json` already configures a daily cron hitting `/api/cron/sync` as a backstop in case a webhook is missed.

## Going to production (real Chase/PNC/Discover accounts)

Sandbox mode only connects to Plaid's fake test institutions. To link real accounts:

1. In the Plaid dashboard, request Production access (describe the use case as a personal finance tracker).
2. Once approved, set `PLAID_ENV=production` and swap in the production `PLAID_SECRET`.
3. Re-link accounts through the same "Link a bank account" flow — Plaid Link's UI is identical, it just uses real bank OAuth/credentials instead of Sandbox fixtures.

## Project structure

- `prisma/schema.prisma` — `Item` (linked bank connection), `Account`, `Category`, `Transaction`.
- `src/lib/plaid-sync.ts` — cursor-based `transactions/sync` loop; the core of keeping data fresh.
- `src/app/api/plaid/webhook/route.ts` — verifies and handles Plaid webhooks (JWT + body-hash verification).
- `src/app/(app)/*` — authenticated pages: dashboard, accounts, transactions, settings.
- `src/proxy.ts` — Next.js 16's renamed `middleware.ts`; gates every route behind login except `/login`, NextAuth's own routes, the Plaid webhook, and the cron endpoint.
