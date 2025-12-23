# Supabase Setup

1. Install the Supabase CLI (`brew install supabase/tap/supabase` or download from releases).
2. Start the local stack when developing:
```
supabase start
```
3. Apply migrations from this folder:
```
supabase migration up
```
4. Generate types for the client (optional, recommended for server actions):
```
supabase gen types typescript --local > src/types/database.types.ts
```

Tables and policies live in `migrations/0001_init.sql` and mirror the PRD: profiles/roles, matters, tasks, intake, time entries, packages, invoices, documents, and audit logs with RLS for Admin/Staff/Client.
