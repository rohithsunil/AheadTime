# AGENTS.md

## Project Context

AheadTime is a React PWA for tracking document/subscription renewals. It uses **Supabase** for auth, database, and file storage. Base44 has been fully removed.

Start with `README.md` for local setup, environment variables, and deployment.

## Key Files

- `src/` — frontend application source
- `src/api/db.js` — Supabase SDK wrapper (auth + entities + storage)
- `src/api/supabaseClient.js` — Supabase client initialization
- `vite.config.js` — Vite config (no Base44 plugin)
- `.env.local` — local-only Supabase credentials; never commit secrets
- `supabase/migrations/` — database schema

## Working Notes

- Use `npm run dev` for local development
- Run `npm run lint` and `npm run build` before finishing code changes
- Entity access goes through `import { db } from '@/api/db'`
- Schema changes belong in new files under `supabase/migrations/`
