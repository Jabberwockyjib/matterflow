# Traefik Dev Infrastructure Migration

**Date:** 2026-01-02
**Status:** Approved

## Overview

Migrate MatterFlow from Supabase CLI (`supabase start`) to a custom Docker Compose setup with Traefik routing. This eliminates port collisions and standardizes on hostname-based access.

## Architecture

### Hostnames (via Traefik)

| Service | Hostname | Purpose |
|---------|----------|---------|
| Next.js (host) | `matterflow.local` | Main application |
| Kong | `api.matterflow.local` | Supabase API |
| Studio | `studio.matterflow.local` | Database management UI |
| Mailpit | `mail.matterflow.local` | Email testing inbox |

### Networks

- `matterflow_net` - Internal project network (all Supabase services)
- `traefik_net` - External, shared with Traefik (already exists)

### Host Routing

Traefik routes `matterflow.local` to `host.docker.internal:3000` for Next.js hot reload on host.

## Docker Compose Services

1. **db** - Postgres 17 with Supabase extensions
2. **kong** - API gateway (Traefik labels for `api.matterflow.local`)
3. **auth** (GoTrue) - Authentication service
4. **rest** (PostgREST) - Auto-generated REST API
5. **storage** - File storage API
6. **realtime** - WebSocket subscriptions
7. **studio** - Database UI (Traefik labels for `studio.matterflow.local`)
8. **mailpit** - Email testing (Traefik labels for `mail.matterflow.local`)
9. **meta** - Postgres metadata API (for Studio)

### Volumes

- `db_data` - Postgres persistence

## Environment Configuration

### `.env.docker` (committed, no secrets)

```bash
COMPOSE_PROJECT_NAME=matterflow
POSTGRES_PASSWORD=postgres
JWT_SECRET=super-secret-jwt-token-for-local-dev-only
ANON_KEY=<generated>
SERVICE_ROLE_KEY=<generated>
```

### `.env.local` (not committed)

```bash
# Supabase via Traefik
NEXT_PUBLIC_SUPABASE_URL=https://api.matterflow.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from .env.docker>
SUPABASE_SERVICE_ROLE_KEY=<from .env.docker>

# App URL (no localhost)
NEXT_PUBLIC_APP_URL=https://matterflow.local

# Google OAuth
GOOGLE_REDIRECT_URI=https://matterflow.local/api/auth/google/callback
```

## Developer Workflow

### Command Mapping

| Old Command | New Command |
|-------------|-------------|
| `supabase start` | `docker compose up -d` |
| `supabase stop` | `docker compose down` |
| `supabase db reset` | `docker compose down -v && docker compose up -d` |
| `supabase status` | `docker compose ps` |

### Daily Workflow

1. `docker compose up -d` - Start Supabase stack
2. `pnpm dev` - Start Next.js on host
3. Open `https://matterflow.local` - App
4. Open `https://studio.matterflow.local` - DB management
5. Open `https://mail.matterflow.local` - Test emails

### One-Time Setup

1. Add `/etc/hosts` entries:
   ```
   127.0.0.1 matterflow.local api.matterflow.local studio.matterflow.local mail.matterflow.local
   ```
2. Copy `.env.docker` values to `.env.local`
3. Trust local TLS cert (if using HTTPS via Traefik)

## Files to Create

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full Supabase stack with Traefik labels |
| `.env.docker` | Docker environment variables |
| `docs/LOCAL_DEV_SETUP.md` | Setup instructions for new devs |

## Files to Modify

| File | Changes |
|------|---------|
| `.env.example` | Update URLs to `*.matterflow.local` pattern |
| `CLAUDE.md` | Update commands section |
| `.gitignore` | Add `.env.docker.local` for secret overrides |

## Constraints

- No exposed ports except Traefik (80/443)
- All services communicate via Docker DNS
- No `localhost` or port numbers in any config
- Existing migrations and seed data remain valid

## Migration Steps

1. Stop existing Supabase CLI containers (`supabase stop`)
2. Create `docker-compose.yml` with all services
3. Create `.env.docker` with JWT keys
4. Update `.env.local` with new hostnames
5. Add `/etc/hosts` entries
6. Start new stack (`docker compose up -d`)
7. Apply migrations
8. Verify all endpoints accessible via hostnames
