# Repository Guidelines

Use this playbook to keep MatterFlow™ contributions consistent with the PRD in `project.md`.

## Project Structure & Module Organization
- Expected layout as the app materializes:
```
src/           # Next.js (App Router) UI, shadcn/ui components, Tailwind styles
src/app/(...)  # feature routes (matters, billing, intake, dashboard)
src/lib/       # shared utilities (Supabase client, API SDKs, auth guards)
supabase/      # SQL/RLS policies, migrations, edge functions
tests/         # mirrors src/; unit + integration specs
docs/          # ADRs, flows, domain models; keep PRD updates here
scripts/       # dev setup, data seeding, codegen
```
- Organize by feature domain (e.g., `src/app/matters/`, `src/app/billing/`) to mirror the matter pipeline and billing flows.

## Build, Test, and Development Commands
- Use `pnpm` + `make` (or package scripts) to hide tooling details:
  - `pnpm install` — install deps.
  - `pnpm dev` — run Next.js locally with Supabase auth hooks.
  - `pnpm test` — run unit/integration tests (keep under 2–3 min).
  - `pnpm lint` — ESLint + Prettier (fail on warnings).
  - `pnpm supabase:start` — local Supabase stack when added.
- Document any required env vars in `.env.example` (Square, Google, Supabase).

## Coding Style & Naming Conventions
- JS/TS: 2-space indent, 100–120 char lines, Prettier + ESLint (Next.js + Tailwind plugins).
- Components/hooks/types in `PascalCase`; helpers in `camelCase`; files in `kebab-case`.
- Keep server/client boundaries explicit; prefer typed APIs for Supabase and external integrations.

## Testing Guidelines
- Place specs in `tests/` mirroring feature folders; use `*.spec.ts(x)` or `*.test.ts`.
- Target ≥80% coverage once CI is wired; add regression tests with every bug fix.
- No live calls to Square/Google in tests—mock SDKs and use fixtures under `tests/fixtures/`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: matter stages`, `fix: square retry`, `chore: supabase rls`).
- PRs should include: summary, rationale tied to PRD section, local test commands, screenshots for UI.
- Keep PRs narrow (one module/feature slice); ensure CI is green before requesting review.

## Security & Configuration Tips
- Do not commit secrets; use `.env` + `.env.example` (redact tokens). Enable `.gitignore` for local state.
- Supabase: ship RLS policies with migrations; log auth/permission changes; audit document/invoice access.
- Square/Google: route credentials through server-side calls or edge functions; never expose keys to the client.
