---
title: Supabase Migration Repair
tags: [supabase, migrations, bugs, db-push, SQLSTATE]
sources: [CC-Session-Logs/05-04-2026-19_30-venue-portal-db-push.md]
updated: 2026-04-09
---

# Supabase Migration Repair

When migrations have been applied manually (via SQL Editor) but not recorded in `supabase_migrations.schema_migrations`, `npx supabase db push` fails with errors that look like bugs but are actually a history sync problem.

## Error Patterns

### SQLSTATE 42710 — "policy already exists"

Migration tries to `CREATE POLICY` but it already exists from a manual run.

**Fix**: Record the migration as already applied:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES ('20260320000001', null, 'migration_name')
ON CONFLICT DO NOTHING;
```

Then re-run `npx supabase db push`.

### SQLSTATE 2BP01 — "cannot drop column because objects depend on it"

Migration tries to `DROP COLUMN` but a policy references that column.

**Fix**: Drop the dependent policy first, then drop the column manually in SQL Editor:

```sql
DROP POLICY IF EXISTS "policy name" ON table_name;
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
```

Then insert the migration version into `schema_migrations` and re-run `db push`.

### "Potential issue detected: destructive operations" (SQL Editor warning)

This is an informational warning from the Supabase SQL Editor. Click **Run this query** — it is not blocking.

## Full Repair Sequence

1. Run `npx supabase db push` from `e:/Frendli` (repo root)
2. Read the error — identify which version failed and why
3. If policy/table already exists: INSERT the version into `schema_migrations`
4. If drop is blocked by a dependent object: drop the dependent first, then drop manually
5. Re-run `db push` — repeat until "Remote database is up to date"

## Verified Migration Versions (as of 2026-04-07)

| Version | Name |
|---|---|
| `20260320000001` | `venue_portal` |
| `20260329000001` | `venue_description_enhancements` |
| `20260405000001` | `venue_reports` |
| `20260405000002` | `promotion_status` |
| `20260407000001` | `safety_sessions` |
