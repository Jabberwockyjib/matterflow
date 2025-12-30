# Supabase Multi-Project Development Setup

This document explains how the therapy project is configured to run alongside other Supabase projects (Recive, mna) on the same development machine.

## Problem

When multiple Supabase projects run on the same machine, they compete for the same default ports (54321-54327), causing Docker container failures and unpredictable behavior.

**Symptoms:**
- `docker ps` shows containers from multiple projects
- Supabase containers fail to start
- Port conflicts in Docker logs
- Inconsistent behavior across projects

## Root Cause

The therapy project initially had **no `supabase/config.toml`** file, so it defaulted to the standard Supabase ports (54321-54327). These ports were already in use by the Recive project, causing conflicts.

## Solution

Each Supabase project on this machine now has a **dedicated port range** configured in `supabase/config.toml`:

| Project  | Port Range   | API Port | DB Port | Studio Port | Email Port |
|----------|-------------|----------|---------|-------------|------------|
| **Recive** | 54321-54327 | 54321    | 54322   | 54323       | 54324      |
| **therapy** | 54331-54340 | 54331    | 54332   | 54333       | 54334      |
| **mna**    | 54342-54349 | 54342    | 54343   | (tbd)       | (tbd)      |

### therapy Project Configuration

Created `supabase/config.toml` with these key settings:

```toml
project_id = "therapy"

[api]
port = 54331

[db]
port = 54332
shadow_port = 54338

[studio]
port = 54333

[inbucket]
port = 54334

[analytics]
port = 54337
vector_port = 54340
```

### Environment Variables

Updated `.env.local` to use the new ports:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
SUPABASE_URL=http://127.0.0.1:54331
```

## Verification

After applying this fix:

1. **Supabase starts cleanly:**
   ```bash
   supabase start
   # Shows therapy containers on ports 54331-54340
   ```

2. **No port conflicts:**
   ```bash
   docker ps --filter "name=supabase"
   # Shows Recive containers on 54321-54323
   # Shows therapy containers on 54331-54337
   # No conflicts!
   ```

3. **Database connection works:**
   ```bash
   docker exec supabase_db_therapy psql -U postgres -c "SELECT COUNT(*) FROM profiles;"
   ```

4. **Application connects successfully:**
   ```bash
   pnpm dev
   # Next.js connects to Supabase on port 54331
   ```

5. **Authentication works:**
   ```bash
   node test-admin-signin.mjs
   # ✅ Sign-in successful!
   ```

## Adding New Projects

When adding another Supabase project to this machine:

1. Choose an unused port range (e.g., 54350-54359)
2. Create `supabase/config.toml` with unique `project_id` and ports
3. Update project's `.env.local` to use the new port range
4. Document the port allocation in this file

## Troubleshooting

### Check which project is using which ports:
```bash
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Ports}}"
```

### Stop all Supabase containers:
```bash
# Stop specific project
cd /path/to/project && supabase stop

# Or stop all Docker containers
docker stop $(docker ps -q --filter "name=supabase")
```

### Verify project isolation:
```bash
# In each project directory
supabase status
# Should show unique ports for each project
```

## Benefits

- ✅ All projects run simultaneously without conflicts
- ✅ Each project has predictable, stable ports
- ✅ Easy to identify which containers belong to which project
- ✅ No need to stop/start containers when switching projects
- ✅ Clean separation of development environments

## References

- [Supabase CLI Config Reference](https://supabase.com/docs/reference/cli/config)
- Commit: `058df38` - Added config.toml with dedicated port range
- Commit: `a337c98` - Updated test scripts to use new ports
