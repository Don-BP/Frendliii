---
title: Venue Portal Features
tags: [venue-portal, analytics, promotions, reports, QR, supabase, jsPDF]
sources: [CC-Session-Logs/05-04-2026-22_00-venue-portal-gap-plans.md, CC-Session-Logs/05-04-2026-18_00-venue-portal-4-plans.md, CC-Session-Logs/05-04-2026-19_30-venue-portal-db-push.md]
updated: 2026-04-09
---

# Venue Portal

React 19 / Vite / Tailwind app for venue partners. All 4 gap plans fully implemented as of 05-04-2026.

## Promotion Workflow

Status enum `draft | active | ended` replaced the legacy `is_active` boolean entirely.

**Tier limits** (user-confirmed, not in PRD):
| Tier | Max active promotions |
|---|---|
| Listed | 0 |
| Perks | 2 |
| Premier | 4 |

`usePromotions(venueId, tier)` computes `canActivate = activeCount < tierLimit` client-side. Active count = `status === 'active' AND valid_until > now`.

**No "Pending Review" status** — venues activate instantly. Workflow: Draft → Active → Ended.

**Deployment order for migration**: update `redeem-coupon` edge function first (add `status !== 'active'` check) → run migration → deploy portal. Prevents broken coupon validation window.

Key files:
- `venue-portal/src/hooks/usePromotions.ts`
- `venue-portal/src/pages/Promotions.tsx`
- `venue-portal/src/components/PromotionForm.tsx`
- Migration: `supabase/migrations/20260405000002_promotion_status.sql`

## Analytics Dashboard

`useDashboardStats` hook owns all 8 PRD metric computations. `Dashboard.tsx` is pure rendering. Hourly chart buckets use `getUTCHours()` (not local) for timezone consistency.

Key files:
- `venue-portal/src/hooks/useDashboardStats.ts`
- `venue-portal/src/pages/Dashboard.tsx`

## Monthly Reports

On-demand client-side PDF generation via jsPDF (already installed, no server cost). Server delivers scheduled reports via pg_cron + Supabase edge function.

- `pg_cron` job: `send-monthly-reports-daily` — `0 8 * * *` (job ID 1)
- Email via Resend — `FROM_EMAIL = onboarding@resend.dev` (dev only)
- Signed URL TTL: 1 hour (`getSignedUrl`)
- Reports page wrapped in `TierGate` (perks+ only)
- Settings upsert uses `ignoreDuplicates:false` then separate select-single

Key files:
- `venue-portal/src/hooks/useReports.ts`
- `venue-portal/src/pages/Reports.tsx`
- `supabase/functions/send-monthly-report/index.ts`
- `supabase/functions/send-monthly-report-batch/index.ts`
- Migration: `supabase/migrations/20260405000001_venue_reports.sql`

## QR Scanner

`html5-qrcode` library chosen over BarcodeDetector API (no iOS Safari) and @zxing/browser (too heavy). Tab UI alongside manual entry — not replacing it. Auto-submits on scan (no extra tap).

QR code encodes the 6-character alphanumeric coupon code directly. Reuses all existing `redeem-coupon` edge function logic with zero backend changes.

Key files:
- `venue-portal/src/pages/Redemption.tsx` — tab UI: QR tab + Manual tab

## Storage

`venue-reports` private bucket. SELECT policy expression: `(storage.foldername(name))[1] = auth.uid()::text`. No INSERT policy needed — edge function uses service role key (bypasses RLS).

See [[bugs/supabase-migration-repair]] for the `db push` repair workflow used to apply these migrations.

## TierGate

Render-prop wrapper component in venue-portal. Pass `venue` prop and children for conditional tier-gated UI. Used to gate Reports page (perks+) and new promotions button.

## Supabase Project

Project ID: `vodhhpgtxftxqdokghhc`
