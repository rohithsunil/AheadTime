# AheadTime

Personal renewal tracker — documents, subscriptions, vouchers, and warranties in one place. Runs fully offline-capable as a PWA with Supabase backend.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

## Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment template and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project **Settings → API**.

3. Apply the database schema. In the Supabase dashboard, open **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

Or, if you use the Supabase CLI:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

4. In Supabase **Authentication → URL Configuration**, set:
   - **Site URL**: `http://localhost:5173` (or your production URL)
   - **Redirect URLs**: `http://localhost:5173/reset-password`, your production URL equivalents

5. Enable **Email** auth provider. Optionally enable **Google** OAuth under Authentication → Providers.

6. Start the dev server:

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Supabase Keepalive

Free-tier Supabase projects pause after ~7 days of inactivity. This repo includes:

- **GitHub Actions** (`.github/workflows/supabase-keepalive.yml`) — pings your project daily
- **`ping_keepalive()` SQL function** — updates a heartbeat row in the database
- **`flyswatter/`** — optional Fly.io deployment based on [supabase/flyswatter](https://github.com/supabase/flyswatter)

Set `SUPABASE_PROJECT_REF` and `SUPABASE_ANON_KEY` as GitHub repository secrets to enable the Actions workflow.

## Deployment

Build the static site and deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.):

```bash
npm run build
```

Set the same `VITE_SUPABASE_*` environment variables in your hosting provider.

## Project Structure

- `src/` — React frontend (Vite + Tailwind)
- `src/api/db.js` — Supabase compatibility layer (replaces former Base44 SDK)
- `supabase/migrations/` — Database schema
- `public/` — PWA manifest and service worker
