# MatterFlow MVP (Next.js + Supabase)

Front-end scaffold for the MatterFlow™ MVP outlined in `project.md`. Stack: Next.js (App Router), Tailwind 3 + shadcn-style components, Supabase JS client, pnpm.

## Getting Started
1. Install dependencies:
```bash
pnpm install
```
2. Copy envs and fill secrets:
```bash
cp .env.example .env.local
```
3. Run the app:
```bash
pnpm dev
```

## Scripts
- `pnpm dev` — start Next.js locally.
- `pnpm lint` — Next.js lint rules.
- `pnpm typecheck` — TypeScript with no emit.
- `pnpm test` — placeholder (wire Vitest/RTL next).

## Supabase (local)
- Install CLI and start services: `supabase start`
- Apply schema/RLS: `supabase migration up` (see `supabase/migrations/0001_init.sql`)
- (Optional) generate types: `supabase gen types typescript --local > src/types/database.types.ts`

## Structure
- `src/app` — routes and layout (dashboard control center)
- `src/components/ui` — shadcn-style primitives
- `src/lib` — utilities and Supabase client
- `supabase/` — migrations + setup notes
- `AGENTS.md` — contributor guide tailored to the PRD

## Current status
- Dashboard, matters, tasks, billing, and time pages are live; forms create and update records with Supabase, gated by role and RLS.
- Supabase schema + RLS shipped (`supabase/migrations/0001_init.sql`); local env uses `supabase start` and seeds in `supabase/seed.sql`.
- Auth uses Supabase email+password (magic link optional if enabled); anonymous sign-in disabled. Middleware redirects unauthenticated users.
- Actions log to `audit_logs`; tests and lint pass (`pnpm test`, `pnpm lint`).

## Remaining MVP steps
- Tighten RBAC in middleware/UI (client role read-only); add form validation and toasts for errors/success.
- Add integration tests (Vitest + RTL) for form submissions and role visibility.
- Stub intake/conflict/documents views and Square/Drive retry surfaces per `project.md`.
- Disable anonymous auth entirely in non-dev, and wire audit logging for all mutations.
