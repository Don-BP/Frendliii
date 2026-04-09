---
title: Supabase Patterns
tags: [supabase, pg_cron, edge-functions, migrations, RLS, storage]
sources: [CC-Session-Logs/07-04-2026-10_00-safe-arrival-stage-4-deploy.md, CC-Session-Logs/05-04-2026-19_30-venue-portal-db-push.md, CC-Session-Logs/05-04-2026-18_00-venue-portal-4-plans.md]
updated: 2026-04-09
---

# Supabase Patterns

## DB Push

**Always run from repo root** (`e:/Frendli`). Supabase CLI needs access to `supabase/config.toml` and the migrations folder.

```bash
cd e:/Frendli
npx supabase db push
```

Does NOT require Docker for remote projects. Docker is only needed for local testing.

## Migration Repair

When tables/policies were applied manually (SQL Editor) but not recorded in migration history:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES
  ('20260320000001', null, 'venue_portal'),
  ('20260329000001', null, 'venue_description_enhancements'),
  ('20260405000001', null, 'venue_reports'),
  ('20260405000002', null, 'promotion_status')
ON CONFLICT DO nothing;
```

Then re-run `npx supabase db push` — it will skip already-recorded versions.

See [[bugs/supabase-migration-repair]] for error patterns.

## Edge Functions Deployment

```bash
npx supabase functions deploy <function-name>
```

Works without Docker for remote projects. Runs from repo root.

## pg_cron Jobs

Register via Supabase Dashboard → SQL Editor:

```sql
select cron.schedule(
  'job-name',
  '*/5 * * * *',
  $$ select net.http_post(
    url := 'https://vodhhpgtxftxqdokghhc.supabase.co/functions/v1/<function>',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) $$
);
```

`cron.schedule()` returns an integer job ID. Verify with:
```sql
select jobid, jobname, schedule from cron.job;
```

**Current jobs:**
| ID | Name | Schedule | Target |
|---|---|---|---|
| 1 | `send-monthly-reports-daily` | `0 8 * * *` | `send-monthly-report-batch` |
| 2 | `safety-escalation-check` | `*/5 * * * *` | `safety-escalation` |
| 3 (planned) | `notify-expiring-perks-daily` | `0 9 * * *` | `notify-expiring-perks` |

## Storage Bucket RLS Policy UI

Supabase Dashboard → Storage → Bucket → Policies → "Add new policy" dialog is **form-based, not raw SQL**. Enter ONLY the USING expression — not the full `CREATE POLICY` statement.

Example (venue-reports bucket, SELECT policy):
```
(storage.foldername(name))[1] = auth.uid()::text
```

No INSERT policy needed when uploads go through service role key (bypasses RLS).

## Secrets

```bash
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set FROM_EMAIL=onboarding@resend.dev
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

`FROM_EMAIL = onboarding@resend.dev` only delivers to the Resend account owner's email until a custom domain is verified. Acceptable for dev.

## Supabase Project

Project ID: `vodhhpgtxftxqdokghhc`
URL: `https://vodhhpgtxftxqdokghhc.supabase.co`
