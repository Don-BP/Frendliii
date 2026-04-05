# Monthly Foot Traffic Reports — Design Spec
**Date:** 2026-04-05
**Area:** venue-portal + supabase
**Priority:** High

## Overview

Venue partners on Perks and Premier tiers receive a monthly foot traffic report. Reports are always accessible in the venue portal. Venues can optionally receive the report by email on a configurable day each month (default: 1st). A Supabase pg_cron job triggers automated delivery; venues can also generate reports on demand.

## Requirements

- Monthly reports visible in a new Reports page in the venue portal
- PDF download available for each report
- Auto-generation on a configurable day each month (default: 1st, range: 1–28)
- Email delivery opt-in (default: on); venues can disable it
- Report settings (delivery day, email toggle) configurable inline on the Reports page
- Reports accessible to Perks and Premier tiers only (tier-gated)
- On-demand "Generate Report" button for the current month

## Report Content

Each report covers one calendar month and includes:

1. **Summary tile row** — total redemptions, unique visitors, avg group size
2. **Daily redemption chart** — bar chart of redemptions per day for the month
3. **Hourly traffic chart** — peak hours breakdown
4. **New vs returning split** — pie or percentage breakdown
5. **Top promotions** — promotions ranked by redemption count
6. **Month-over-month comparison** — redemption count vs prior month (% change)

## Data Model

### New table: `venue_report_settings`

```sql
CREATE TABLE venue_report_settings (
  venue_id        UUID PRIMARY KEY REFERENCES auth.users(id),
  email_enabled   BOOLEAN NOT NULL DEFAULT true,
  delivery_day    INTEGER NOT NULL DEFAULT 1 CHECK (delivery_day BETWEEN 1 AND 28),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Row is created with defaults on first visit to the Reports page if it doesn't exist (upsert).

### New table: `venue_reports`

```sql
CREATE TABLE venue_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES auth.users(id),
  report_month  DATE NOT NULL,  -- always the 1st of the month
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url       TEXT,           -- Supabase storage URL; null if not yet generated
  UNIQUE (venue_id, report_month)
);
```

### New Supabase storage bucket: `venue-reports`

Private bucket. RLS policy: venues can only read their own reports (`venue_id = auth.uid()`).

## Architecture

### `venue-portal/src/pages/Reports.tsx` (new)

Three sections:

**1. Report settings panel**
- Toggle: "Receive monthly email report" (checkbox, default on)
- Input: "Send on day" (number input 1–28, default 1)
- Auto-saves on change (debounced upsert to `venue_report_settings`)

**2. Generate report**
- "Generate Report for [current month]" button
- Disabled if a report for the current month already exists
- On click: runs data queries, builds PDF with `jsPDF`, uploads to `venue-reports` storage, inserts record into `venue_reports`, triggers email if `email_enabled = true`

**3. Past reports list**
- Lists all rows in `venue_reports` for this venue, newest first
- Each row: month label (e.g. "March 2026"), generated date, Download PDF button
- Download fetches a signed URL from Supabase storage

### `venue-portal/src/hooks/useReports.ts` (new)

Handles:
- Fetching `venue_report_settings` (upsert defaults on first load)
- Fetching `venue_reports` list
- `generateReport(month: Date)` — queries data, builds PDF, uploads, inserts record
- `updateSettings(patch)` — upserts to `venue_report_settings`

### PDF Generation

Client-side using `jsPDF`. The `generateReport` function:
1. Runs all data queries (same queries as `useDashboardStats` but scoped to the target month)
2. Builds a structured PDF document with `jsPDF` (text + simple bar chart drawn with `jsPDF` rectangles — no canvas dependency)
3. Converts to a `Blob`, uploads to `venue-reports/{venueId}/{YYYY-MM}.pdf`
4. Returns the storage URL

### Email Delivery

A new Supabase edge function `send-monthly-report`:
- Accepts `{ venueId, reportMonth, pdfUrl }`
- Fetches venue details (name, contact email) from the DB
- Sends email via the existing email provider with the PDF attached or linked
- Called from the portal on on-demand generation (if `email_enabled`) and by pg_cron for scheduled delivery

### Scheduled Delivery (`pg_cron`)

A `pg_cron` job runs daily at 08:00 UTC:

```sql
SELECT cron.schedule(
  'monthly-report-delivery',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_FUNCTIONS_URL>/send-monthly-report-batch',
    body := '{}'::jsonb
  )
  $$
);
```

A second edge function `send-monthly-report-batch`:
- Queries `venue_report_settings` WHERE `delivery_day = EXTRACT(day FROM now())`  AND `email_enabled = true`
- For each matching venue, generates the report data and calls `send-monthly-report`

## Navigation

Reports page added to the venue portal nav sidebar, between Dashboard and Promotions. Tier-gated: hidden for Listed venues.

## New Dependency

`jspdf` added to `venue-portal/package.json`.

## Testing

- Unit test: `useReports` upserts default settings on first load
- Unit test: `generateReport` inserts a record into `venue_reports` after upload
- Unit test: Reports list shows newest first
- Unit test: Generate button disabled when report for current month already exists
- Unit test: `send-monthly-report-batch` only calls venues whose `delivery_day` matches today
