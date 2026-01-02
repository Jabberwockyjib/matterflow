# Traefik Dev Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `supabase start` with a custom Docker Compose setup that routes all traffic through Traefik via `*.matterflow.local` hostnames.

**Architecture:** Supabase services run in Docker on `matterflow_net`, exposed via Traefik labels. Next.js runs on host, accessed via Traefik dynamic config routing to `host.docker.internal:3000`. No ports exposed except Traefik's 80/443.

**Tech Stack:** Docker Compose, Traefik v3, Supabase (Postgres 17, Kong, GoTrue, PostgREST, Storage, Realtime, Studio, Mailpit)

---

## Task 1: Stop Existing Supabase Containers

**Files:** None

**Step 1: Stop Supabase CLI containers**

Run:
```bash
supabase stop
```

Expected: All `supabase_*_therapy` containers stopped and removed.

**Step 2: Verify containers stopped**

Run:
```bash
docker ps | grep supabase
```

Expected: No output (no supabase containers running).

**Step 3: Verify traefik_net exists**

Run:
```bash
docker network ls | grep traefik_net
```

Expected: `traefik_net` network listed.

---

## Task 2: Create Docker Environment File

**Files:**
- Create: `docker/.env`

**Step 1: Create docker directory**

Run:
```bash
mkdir -p /Users/brian/dev/therapy/docker
```

**Step 2: Create .env file with Supabase configuration**

Create `docker/.env`:
```bash
# MatterFlow Docker Environment
# This file is committed - no secrets here

COMPOSE_PROJECT_NAME=matterflow

# Postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

# JWT Configuration (standard Supabase demo keys)
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Service URLs (internal Docker DNS)
SUPABASE_URL=http://kong:8000
SITE_URL=http://matterflow.local
API_EXTERNAL_URL=http://api.matterflow.local

# Studio
STUDIO_PG_META_URL=http://meta:8080
```

**Step 3: Commit docker/.env**

Run:
```bash
git add docker/.env
git commit -m "chore: add docker environment file for Traefik setup"
```

---

## Task 3: Create Kong Configuration

**Files:**
- Create: `docker/kong/kong.yml`

**Step 1: Create kong directory**

Run:
```bash
mkdir -p /Users/brian/dev/therapy/docker/kong
```

**Step 2: Create Kong configuration file**

Create `docker/kong/kong.yml`:
```yaml
_format_version: "1.1"

services:
  # Auth endpoints (GoTrue)
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors

  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors

  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey

  # REST endpoints (PostgREST)
  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey

  # GraphQL endpoint
  - name: graphql-v1
    url: http://rest:3000/rpc/graphql
    routes:
      - name: graphql-v1-all
        strip_path: true
        paths:
          - /graphql/v1
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey

  # Realtime WebSocket
  - name: realtime-v1
    url: http://realtime:4000/socket
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors

  # Storage endpoints
  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  # Postgres Meta (for Studio)
  - name: pg-meta
    url: http://meta:8080/
    routes:
      - name: pg-meta-all
        strip_path: true
        paths:
          - /pg/
    plugins:
      - name: cors

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}
```

**Step 3: Commit Kong config**

Run:
```bash
git add docker/kong/kong.yml
git commit -m "chore: add Kong API gateway configuration"
```

---

## Task 4: Create Docker Compose File

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

Create `docker-compose.yml` at project root:
```yaml
# MatterFlow Development Stack
# Usage: docker compose up -d
# Replaces: supabase start

name: matterflow

services:
  # ===================
  # Database
  # ===================
  db:
    image: public.ecr.aws/supabase/postgres:17.6.1.064
    container_name: matterflow_db
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d/migrations:ro
      - ./supabase/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
    networks:
      - matterflow_net

  # ===================
  # API Gateway (Kong)
  # ===================
  kong:
    image: public.ecr.aws/supabase/kong:2.8.1
    container_name: matterflow_kong
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      auth:
        condition: service_started
      rest:
        condition: service_started
      storage:
        condition: service_started
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
    volumes:
      - ./docker/kong/kong.yml:/home/kong/kong.yml:ro
    networks:
      - matterflow_net
      - traefik_net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.matterflow-api.rule=Host(`api.matterflow.local`)"
      - "traefik.http.routers.matterflow-api.entrypoints=web"
      - "traefik.http.services.matterflow-api.loadbalancer.server.port=8000"

  # ===================
  # Authentication (GoTrue)
  # ===================
  auth:
    image: public.ecr.aws/supabase/gotrue:v2.184.0
    container_name: matterflow_auth
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: "*"
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_HOST: mailpit
      GOTRUE_SMTP_PORT: 1025
      GOTRUE_SMTP_ADMIN_EMAIL: admin@matterflow.local
      GOTRUE_SMTP_SENDER_NAME: MatterFlow
      GOTRUE_MAILER_URLPATHS_INVITE: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_RECOVERY: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /auth/v1/verify
    networks:
      - matterflow_net

  # ===================
  # REST API (PostgREST)
  # ===================
  rest:
    image: public.ecr.aws/supabase/postgrest:v14.1
    container_name: matterflow_rest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: 3600
    networks:
      - matterflow_net

  # ===================
  # Realtime
  # ===================
  realtime:
    image: public.ecr.aws/supabase/realtime:v2.68.4
    container_name: matterflow_realtime
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
      DB_AFTER_CONNECT_QUERY: "SET search_path TO _realtime"
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq
      ERL_AFLAGS: -proto_dist inet_tcp
      DNS_NODES: "''"
      RLIMIT_NOFILE: "10000"
      REPLICATION_MODE: RLS
      REPLICATION_POLL_INTERVAL: 100
      SECURE_CHANNELS: "true"
      SLOT_NAME: supabase_realtime_rls
      TEMPORARY_SLOT: "true"
    networks:
      - matterflow_net

  # ===================
  # Storage
  # ===================
  storage:
    image: public.ecr.aws/supabase/storage-api:v1.33.0
    container_name: matterflow_storage
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_IMAGE_TRANSFORMATION: "true"
    volumes:
      - storage_data:/var/lib/storage
    networks:
      - matterflow_net

  # ===================
  # Postgres Meta (for Studio)
  # ===================
  meta:
    image: public.ecr.aws/supabase/postgres-meta:v0.95.1
    container_name: matterflow_meta
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: ${POSTGRES_DB}
      PG_META_DB_USER: postgres
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    networks:
      - matterflow_net

  # ===================
  # Studio (Database UI)
  # ===================
  studio:
    image: public.ecr.aws/supabase/studio:2025.12.09-sha-434634f
    container_name: matterflow_studio
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      kong:
        condition: service_started
      meta:
        condition: service_started
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DEFAULT_ORGANIZATION_NAME: MatterFlow
      DEFAULT_PROJECT_NAME: therapy
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: http://api.matterflow.local
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
      AUTH_JWT_SECRET: ${JWT_SECRET}
      LOGFLARE_API_KEY: ""
      LOGFLARE_URL: ""
      NEXT_PUBLIC_ENABLE_LOGS: "false"
      NEXT_ANALYTICS_BACKEND_PROVIDER: ""
    networks:
      - matterflow_net
      - traefik_net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.matterflow-studio.rule=Host(`studio.matterflow.local`)"
      - "traefik.http.routers.matterflow-studio.entrypoints=web"
      - "traefik.http.services.matterflow-studio.loadbalancer.server.port=3000"

  # ===================
  # Email Testing (Mailpit)
  # ===================
  mailpit:
    image: public.ecr.aws/supabase/mailpit:v1.22.3
    container_name: matterflow_mailpit
    restart: unless-stopped
    networks:
      - matterflow_net
      - traefik_net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.matterflow-mail.rule=Host(`mail.matterflow.local`)"
      - "traefik.http.routers.matterflow-mail.entrypoints=web"
      - "traefik.http.services.matterflow-mail.loadbalancer.server.port=8025"

volumes:
  db_data:
  storage_data:

networks:
  matterflow_net:
    driver: bridge
  traefik_net:
    external: true
```

**Step 2: Commit docker-compose.yml**

Run:
```bash
git add docker-compose.yml
git commit -m "feat: add Docker Compose stack with Traefik routing"
```

---

## Task 5: Add Traefik Dynamic Config for Next.js

**Files:**
- Modify: `/Users/brian/dev/infra/traefik/dynamic.yml`

**Step 1: Add MatterFlow app router to Traefik dynamic config**

Add to `/Users/brian/dev/infra/traefik/dynamic.yml`:
```yaml
http:
  routers:
    traefik-dashboard:
      rule: Host(`traefik.local`)
      service: api@internal

    # MatterFlow Next.js app (runs on host)
    matterflow-app:
      rule: Host(`matterflow.local`)
      service: matterflow-app
      entryPoints:
        - web

  services:
    # Routes to Next.js dev server on host
    matterflow-app:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:3000

  middlewares:
    secure-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
```

**Step 2: Verify Traefik picks up config**

Run:
```bash
docker logs traefik --tail 10 | grep -i matterflow
```

Expected: Log showing matterflow routes loaded (may take a few seconds).

---

## Task 6: Update /etc/hosts

**Files:**
- Modify: `/etc/hosts`

**Step 1: Add MatterFlow hostnames**

Run (requires sudo):
```bash
echo '127.0.0.1 matterflow.local api.matterflow.local studio.matterflow.local mail.matterflow.local' | sudo tee -a /etc/hosts
```

**Step 2: Verify hosts entries**

Run:
```bash
grep matterflow /etc/hosts
```

Expected: `127.0.0.1 matterflow.local api.matterflow.local studio.matterflow.local mail.matterflow.local`

---

## Task 7: Update Application Environment

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

**Step 1: Update .env.local with Traefik URLs**

Update `.env.local`:
```bash
# Supabase via Traefik (no ports!)
NEXT_PUBLIC_SUPABASE_URL=http://api.matterflow.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_URL=http://api.matterflow.local
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# App URL (no localhost!)
NEXT_PUBLIC_APP_URL=http://matterflow.local

# Google OAuth (update redirect URI)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://matterflow.local/api/auth/google/callback
```

**Step 2: Update .env.example**

Update `.env.example`:
```bash
# Public environment variables (safe to expose in the client)
NEXT_PUBLIC_SUPABASE_URL=http://api.matterflow.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://matterflow.local

# Server-side secrets (never commit real values)
SUPABASE_URL=http://api.matterflow.local
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Square Payment Processing
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=your-square-location-id
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key

# Google OAuth for Drive integration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://matterflow.local/api/auth/google/callback

# Email service (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=MatterFlow <noreply@yourdomain.com>

# Cron job security (for automated email reminders)
CRON_SECRET=your-random-secret-key
```

**Step 3: Commit environment changes**

Run:
```bash
git add .env.example
git commit -m "chore: update environment URLs for Traefik routing"
```

---

## Task 8: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add docker override to .gitignore**

Add to `.gitignore`:
```
# Docker local overrides
docker/.env.local
docker-compose.override.yml
```

**Step 2: Commit .gitignore**

Run:
```bash
git add .gitignore
git commit -m "chore: add docker override files to gitignore"
```

---

## Task 9: Start Docker Stack

**Files:** None

**Step 1: Start the stack**

Run:
```bash
cd /Users/brian/dev/therapy && docker compose --env-file docker/.env up -d
```

Expected: All containers start (db, kong, auth, rest, storage, realtime, meta, studio, mailpit).

**Step 2: Verify containers running**

Run:
```bash
docker compose ps
```

Expected: All 9 services showing "running" status.

**Step 3: Wait for database to be ready**

Run:
```bash
docker compose logs db --tail 20 | grep -i "ready to accept connections"
```

Expected: Log showing database ready.

---

## Task 10: Apply Migrations

**Files:** None

**Step 1: Copy migrations into running container and apply**

Run:
```bash
for f in /Users/brian/dev/therapy/supabase/migrations/*.sql; do
  echo "Applying $f..."
  docker exec -i matterflow_db psql -U postgres -d postgres < "$f"
done
```

Expected: Each migration applied successfully.

**Step 2: Apply seed data**

Run:
```bash
docker exec -i matterflow_db psql -U postgres -d postgres < /Users/brian/dev/therapy/supabase/seed.sql
```

Expected: Seed data inserted.

---

## Task 11: Verify Endpoints

**Files:** None

**Step 1: Test API endpoint**

Run:
```bash
curl -s http://api.matterflow.local/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" | head -5
```

Expected: JSON response (possibly empty array or schema info).

**Step 2: Test Studio endpoint**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://studio.matterflow.local/
```

Expected: `200`

**Step 3: Test Mailpit endpoint**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}" http://mail.matterflow.local/
```

Expected: `200`

**Step 4: Start Next.js and test app endpoint**

Run:
```bash
# In separate terminal or background
cd /Users/brian/dev/therapy && pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://matterflow.local/
```

Expected: `200` (or `307` redirect to auth).

---

## Task 12: Update Documentation

**Files:**
- Create: `docs/LOCAL_DEV_SETUP.md`
- Modify: `CLAUDE.md`

**Step 1: Create local dev setup guide**

Create `docs/LOCAL_DEV_SETUP.md`:
```markdown
# Local Development Setup

## Prerequisites

- Docker Desktop
- Node.js 18+
- pnpm

## One-Time Setup

### 1. Add hosts entries

```bash
echo '127.0.0.1 matterflow.local api.matterflow.local studio.matterflow.local mail.matterflow.local' | sudo tee -a /etc/hosts
```

### 2. Ensure Traefik is running

The shared Traefik instance should be running on `traefik_net`. Check with:

```bash
docker ps | grep traefik
```

### 3. Copy environment file

```bash
cp .env.example .env.local
```

Update with your API keys for Square, Google, Resend as needed.

## Daily Workflow

### Start Supabase stack

```bash
docker compose --env-file docker/.env up -d
```

### Start Next.js

```bash
pnpm dev
```

### Access URLs

| Service | URL |
|---------|-----|
| App | http://matterflow.local |
| Supabase API | http://api.matterflow.local |
| Database Studio | http://studio.matterflow.local |
| Email Testing | http://mail.matterflow.local |

### Stop everything

```bash
docker compose down   # Supabase stack
# Ctrl+C in Next.js terminal
```

### Reset database

```bash
docker compose down -v
docker compose --env-file docker/.env up -d
```

## Migrations

Migrations are in `supabase/migrations/`. They auto-apply on first `docker compose up`. To manually apply:

```bash
docker exec -i matterflow_db psql -U postgres -d postgres < supabase/migrations/XXXX_name.sql
```

## Troubleshooting

### "Connection refused" errors
- Ensure Docker stack is running: `docker compose ps`
- Check hosts file: `grep matterflow /etc/hosts`

### Database not ready
- Wait for healthcheck: `docker compose logs db | grep "ready"`

### Traefik not routing
- Verify Traefik running: `docker ps | grep traefik`
- Check network: `docker network ls | grep traefik`
```

**Step 2: Update CLAUDE.md commands section**

In `CLAUDE.md`, update the Essential Commands section:
```markdown
## Essential Commands

```bash
# Development
pnpm install                              # Install dependencies
docker compose --env-file docker/.env up -d  # Start Supabase stack
docker compose down                       # Stop Supabase stack
docker compose down -v                    # Stop + reset database
pnpm dev                                  # Start Next.js dev server

# Access (via Traefik - no ports!)
# App: http://matterflow.local
# API: http://api.matterflow.local
# Studio: http://studio.matterflow.local
# Mail: http://mail.matterflow.local

# Quality checks
pnpm lint                 # ESLint
pnpm typecheck            # TypeScript validation
pnpm test                 # Run all Vitest tests

# Database migrations (manual)
docker exec -i matterflow_db psql -U postgres -d postgres < supabase/migrations/XXXX.sql
```
```

**Step 3: Commit documentation**

Run:
```bash
git add docs/LOCAL_DEV_SETUP.md CLAUDE.md
git commit -m "docs: add local dev setup guide and update CLAUDE.md for Traefik"
```

---

## Task 13: Final Verification

**Files:** None

**Step 1: Full stack test**

1. Open browser to http://studio.matterflow.local - should see Supabase Studio
2. Open browser to http://mail.matterflow.local - should see Mailpit inbox
3. Open browser to http://matterflow.local - should see MatterFlow app (or login page)
4. Sign in and verify data loads correctly

**Step 2: Commit any remaining changes**

Run:
```bash
git status
# If any uncommitted changes, add and commit
```

**Step 3: Final commit summary**

Run:
```bash
git log --oneline -10
```

Expected: Series of commits for Traefik infrastructure migration.

---

## Summary

**Created files:**
- `docker/.env` - Docker environment
- `docker/kong/kong.yml` - Kong API gateway config
- `docker-compose.yml` - Full Supabase stack
- `docs/LOCAL_DEV_SETUP.md` - Developer setup guide

**Modified files:**
- `/Users/brian/dev/infra/traefik/dynamic.yml` - Added matterflow-app router
- `/etc/hosts` - Added matterflow.local entries
- `.env.local` - Updated URLs
- `.env.example` - Updated URL patterns
- `.gitignore` - Added docker overrides
- `CLAUDE.md` - Updated commands

**Replaced workflow:**
- `supabase start` → `docker compose --env-file docker/.env up -d`
- `supabase stop` → `docker compose down`
- `localhost:PORT` → `*.matterflow.local`
