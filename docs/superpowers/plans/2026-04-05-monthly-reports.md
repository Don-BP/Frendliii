# Monthly Foot Traffic Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Reports page to the venue portal where Perks/Premier venues can generate, download, and auto-receive monthly foot traffic PDFs.

**Architecture:** Client-side PDF generation with `jsPDF`. A `useReports` hook manages settings and report records. A Supabase edge function `send-monthly-report` handles email delivery. A `send-monthly-report-batch` edge function is called daily by `pg_cron` to trigger scheduled delivery for qualifying venues. Report PDFs are stored in a private `venue-reports` Supabase storage bucket.

**Tech Stack:** `jsPDF`, Supabase JS client, Supabase Edge Functions (Deno), pg_cron, React, TypeScript, Vitest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260405000001_venue_reports.sql` | Creates `venue_report_settings` and `venue_reports` tables, storage bucket policy |
| Create | `venue-portal/src/hooks/useReports.ts` | Fetch settings, report list, generate report, update settings |
| Create | `venue-portal/src/hooks/__tests__/useReports.test.ts` | Unit tests for useReports |
| Create | `venue-portal/src/pages/Reports.tsx` | Reports page UI: settings, generate button, past reports list |
| Modify | `venue-portal/src/App.tsx` | Add `/reports` route |
| Modify | `venue-portal/src/components/Layout.tsx` (or nav component) | Add Reports nav link |
| Create | `supabase/functions/send-monthly-report/index.ts` | Email one venue's monthly report |
| Create | `supabase/functions/send-monthly-report-batch/index.ts` | pg_cron-triggered batch: find qualifying venues, call send-monthly-report |

---

### Task 1: Install jsPDF

**Files:**
- Modify: `venue-portal/package.json`

- [ ] **Step 1: Install**

```bash
cd venue-portal
npm install jspdf
```

Expected: `added 1 package` (no errors)

- [ ] **Step 2: Commit**

```bash
git add venue-portal/package.json venue-portal/package-lock.json
git commit -m "chore(venue-portal): install jspdf"
```

---

### Task 2: Create Supabase migration

**Files:**
- Create: `supabase/migrations/20260405000001_venue_reports.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260405000001_venue_reports.sql`:

```sql
-- Settings: one row per venue, created on first Reports page visit
CREATE TABLE IF NOT EXISTS venue_report_settings (
  venue_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_day  INTEGER NOT NULL DEFAULT 1 CHECK (delivery_day BETWEEN 1 AND 28),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE venue_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue can manage own settings"
  ON venue_report_settings
  FOR ALL
  USING (auth.uid() = venue_id)
  WITH CHECK (auth.uid() = venue_id);

-- Report records: one per venue per month
CREATE TABLE IF NOT EXISTS venue_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_month  DATE NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url       TEXT,
  UNIQUE (venue_id, report_month)
);

ALTER TABLE venue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue can read own reports"
  ON venue_reports
  FOR SELECT
  USING (auth.uid() = venue_id);

CREATE POLICY "venue can insert own reports"
  ON venue_reports
  FOR INSERT
  WITH CHECK (auth.uid() = venue_id);
```

- [ ] **Step 2: Apply the migration**

```bash
cd e:/Frendli
npx supabase db push
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Create venue-reports storage bucket**

In the Supabase dashboard → Storage → New bucket:
- Name: `venue-reports`
- Public: NO (private)

Then add RLS policy via SQL editor:

```sql
CREATE POLICY "venue can read own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "venue can upload own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'venue-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405000001_venue_reports.sql
git commit -m "feat(supabase): add venue_report_settings and venue_reports tables"
```

---

### Task 3: Create useReports hook (TDD)

**Files:**
- Create: `venue-portal/src/hooks/__tests__/useReports.test.ts`
- Create: `venue-portal/src/hooks/useReports.ts`

- [ ] **Step 1: Write failing tests**

Create `venue-portal/src/hooks/__tests__/useReports.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useReports } from '../useReports'

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      upsert: mockUpsert,
      insert: vi.fn().mockResolvedValue({ error: null }),
      single: vi.fn().mockResolvedValue({
        data: { venue_id: 'v1', email_enabled: true, delivery_day: 1 },
        error: null,
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/report.pdf' }, error: null }),
      })),
    },
  },
}))

describe('useReports — settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads settings on mount', async () => {
    mockSelect.mockReturnThis()
    mockEq.mockReturnThis()
    mockOrder.mockReturnThis()

    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings.email_enabled).toBe(true)
    expect(result.current.settings.delivery_day).toBe(1)
  })
})

describe('useReports — report list', () => {
  it('returns reports sorted newest first', async () => {
    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Order is delegated to Supabase .order('report_month', { ascending: false })
    expect(mockOrder).toHaveBeenCalledWith('report_month', { ascending: false })
  })
})

describe('useReports — updateSettings', () => {
  it('calls upsert with the patched settings', async () => {
    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateSettings({ delivery_day: 15 })
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_day: 15, venue_id: 'venue-1' }),
      expect.anything()
    )
  })
})

describe('useReports — canGenerate', () => {
  it('returns false when a report for the current month already exists', async () => {
    // Simulate reports list containing current month
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    const isoMonth = currentMonth.toISOString().slice(0, 10)

    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: '1', report_month: isoMonth, pdf_url: null, generated_at: '' }], error: null }),
          single: vi.fn().mockResolvedValue({ data: { venue_id: 'v1', email_enabled: true, delivery_day: 1 }, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        })),
        storage: { from: vi.fn(() => ({ upload: vi.fn(), createSignedUrl: vi.fn() })) },
      },
    }))
    // canGenerate is derived client-side from reports list
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd venue-portal
npm test -- useReports
```

Expected: FAIL — `Cannot find module '../useReports'`

- [ ] **Step 3: Create the hook**

Create `venue-portal/src/hooks/useReports.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, format } from 'date-fns'
import { jsPDF } from 'jspdf'

export interface ReportSettings {
  venue_id: string
  email_enabled: boolean
  delivery_day: number
}

export interface ReportRecord {
  id: string
  report_month: string   // 'YYYY-MM-DD' (always 1st of month)
  generated_at: string
  pdf_url: string | null
}

export interface ReportsHook {
  loading: boolean
  settings: ReportSettings
  reports: ReportRecord[]
  canGenerate: boolean
  generateReport: (month?: Date) => Promise<void>
  updateSettings: (patch: Partial<Pick<ReportSettings, 'email_enabled' | 'delivery_day'>>) => Promise<void>
  getSignedUrl: (pdfUrl: string) => Promise<string>
}

const DEFAULT_SETTINGS: ReportSettings = {
  venue_id: '',
  email_enabled: true,
  delivery_day: 1,
}

export function useReports(venueId: string | undefined): ReportsHook {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ReportSettings>(DEFAULT_SETTINGS)
  const [reports, setReports] = useState<ReportRecord[]>([])

  const currentMonthIso = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const canGenerate = !reports.some(r => r.report_month === currentMonthIso)

  useEffect(() => {
    if (!venueId) { setLoading(false); return }

    const load = async () => {
      // Upsert default settings if not exists
      const { data: settingsData } = await supabase
        .from('venue_report_settings')
        .upsert({ venue_id: venueId, email_enabled: true, delivery_day: 1 }, { onConflict: 'venue_id', ignoreDuplicates: true })
        .select()
        .eq('venue_id', venueId)
        .single()

      if (settingsData) setSettings(settingsData as ReportSettings)

      const { data: reportsData } = await supabase
        .from('venue_reports')
        .select('id, report_month, generated_at, pdf_url')
        .eq('venue_id', venueId)
        .order('report_month', { ascending: false })

      setReports((reportsData ?? []) as ReportRecord[])
      setLoading(false)
    }

    load()
  }, [venueId])

  const updateSettings = useCallback(async (
    patch: Partial<Pick<ReportSettings, 'email_enabled' | 'delivery_day'>>
  ) => {
    if (!venueId) return
    const updated = { ...settings, ...patch, venue_id: venueId }
    await supabase.from('venue_report_settings').upsert(updated, { onConflict: 'venue_id' })
    setSettings(updated)
  }, [venueId, settings])

  const generateReport = useCallback(async (month: Date = new Date()) => {
    if (!venueId) return
    const monthStart = startOfMonth(month)
    const monthLabel = format(monthStart, 'MMMM yyyy')
    const reportMonthIso = format(monthStart, 'yyyy-MM-dd')

    // Query redemption data for the month
    const { data: redemptions } = await supabase
      .from('venue_redemptions')
      .select('redeemed_at, user_id')
      .eq('venue_id', venueId)
      .gte('redeemed_at', monthStart.toISOString())
      .not('redeemed_at', 'is', null)

    const rows = redemptions ?? []

    // Build PDF with jsPDF
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(`Frendli — Foot Traffic Report`, 20, 20)
    doc.setFontSize(14)
    doc.text(monthLabel, 20, 30)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Total redemptions: ${rows.length}`, 20, 50)

    const uniqueUsers = new Set(rows.map(r => r.user_id)).size
    doc.text(`Unique visitors: ${uniqueUsers}`, 20, 60)

    // Daily bar chart (ASCII-style using rectangles)
    const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => i + 1)
    const countByDay: Record<number, number> = {}
    days.forEach(d => countByDay[d] = 0)
    rows.forEach(r => {
      const day = new Date(r.redeemed_at).getDate()
      countByDay[day] = (countByDay[day] ?? 0) + 1
    })

    const chartTop = 80
    const chartHeight = 60
    const barWidth = 170 / days.length
    const maxCount = Math.max(...Object.values(countByDay), 1)
    doc.setFillColor(255, 127, 97)

    days.forEach((d, i) => {
      const count = countByDay[d] ?? 0
      const barH = (count / maxCount) * chartHeight
      doc.rect(20 + i * barWidth, chartTop + chartHeight - barH, barWidth - 1, barH, 'F')
    })

    doc.setFontSize(9)
    doc.text('1', 20, chartTop + chartHeight + 6)
    doc.text(`${days.length}`, 20 + (days.length - 1) * barWidth, chartTop + chartHeight + 6)
    doc.text('Daily redemptions', 20, chartTop + chartHeight + 14)

    // Upload to Supabase storage
    const pdfBlob = doc.output('blob')
    const storagePath = `${venueId}/${reportMonthIso}.pdf`
    await supabase.storage.from('venue-reports').upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

    const pdfUrl = storagePath

    // Insert or update record
    const { data: inserted } = await supabase
      .from('venue_reports')
      .upsert({ venue_id: venueId, report_month: reportMonthIso, pdf_url: pdfUrl }, { onConflict: 'venue_id,report_month' })
      .select()
      .single()

    if (inserted) {
      setReports(prev => [inserted as ReportRecord, ...prev.filter(r => r.report_month !== reportMonthIso)])
    }

    // Trigger email if enabled
    if (settings.email_enabled) {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-monthly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ venueId, reportMonth: reportMonthIso, pdfUrl }),
      })
    }
  }, [venueId, settings.email_enabled])

  const getSignedUrl = useCallback(async (pdfUrl: string): Promise<string> => {
    const { data } = await supabase.storage.from('venue-reports').createSignedUrl(pdfUrl, 3600)
    return data?.signedUrl ?? ''
  }, [])

  return { loading, settings, reports, canGenerate, generateReport, updateSettings, getSignedUrl }
}
```

- [ ] **Step 4: Run tests**

```bash
cd venue-portal
npm test -- useReports
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/hooks/useReports.ts venue-portal/src/hooks/__tests__/useReports.test.ts
git commit -m "feat(venue-portal): add useReports hook for monthly report management"
```

---

### Task 4: Create Reports page

**Files:**
- Create: `venue-portal/src/pages/Reports.tsx`

- [ ] **Step 1: Create Reports.tsx**

Create `venue-portal/src/pages/Reports.tsx`:

```typescript
import { useState } from 'react'
import { Download, Mail, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useReports } from '../hooks/useReports'
import { TierGate } from '../components/TierGate'

export default function Reports() {
  const { session, venue } = useAuth()
  const venueId = session?.user?.id
  const { loading, settings, reports, canGenerate, generateReport, updateSettings, getSignedUrl } = useReports(venueId)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    setGenerating(true)
    try {
      await generateReport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (pdfUrl: string, reportMonth: string) => {
    const signedUrl = await getSignedUrl(pdfUrl)
    const a = document.createElement('a')
    a.href = signedUrl
    a.download = `frendli-report-${reportMonth}.pdf`
    a.click()
  }

  if (!venue) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />
      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">
        Monthly Reports
      </h1>

      <TierGate venue={venue}>
        {loading ? (
          <p className="text-[#8E8271] dark:text-[#9E8FC0]">Loading…</p>
        ) : (
          <div className="space-y-6">
            {/* Settings panel */}
            <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">Delivery Settings</h2>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={e => updateSettings({ email_enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#FF7F61]"
                />
                <span className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8] flex items-center gap-2">
                  <Mail size={14} />
                  Receive monthly report by email
                </span>
              </label>

              {settings.email_enabled && (
                <label className="flex items-center gap-3">
                  <Calendar size={14} className="text-[#8E8271] dark:text-[#9E8FC0]" />
                  <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Send on day</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={settings.delivery_day}
                    onChange={e => updateSettings({ delivery_day: Number(e.target.value) })}
                    className="w-16 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-lg px-2 py-1 text-sm text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:border-[#FF7F61]"
                  />
                  <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">of each month</span>
                </label>
              )}
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
              >
                {generating ? 'Generating…' : `Generate ${format(new Date(), 'MMMM yyyy')} Report`}
              </button>
              {!canGenerate && (
                <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">
                  Report for this month already generated.
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Past reports list */}
            {reports.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider">
                  Past Reports
                </h2>
                {reports.map(report => (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">
                        {format(parseISO(report.report_month), 'MMMM yyyy')}
                      </p>
                      <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">
                        Generated {format(parseISO(report.generated_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {report.pdf_url && (
                      <button
                        onClick={() => handleDownload(report.pdf_url!, report.report_month)}
                        className="flex items-center gap-2 text-sm text-[#FF7F61] hover:text-[#E6684B] font-semibold transition-colors"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {reports.length === 0 && (
              <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">
                No reports yet. Generate your first one above.
              </p>
            )}
          </div>
        )}
      </TierGate>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add venue-portal/src/pages/Reports.tsx
git commit -m "feat(venue-portal): add monthly Reports page"
```

---

### Task 5: Add Reports route and nav link

**Files:**
- Modify: `venue-portal/src/App.tsx`
- Modify: nav/sidebar component (check actual filename — likely `venue-portal/src/components/Layout.tsx` or similar)

- [ ] **Step 1: Read App.tsx to find the route structure**

Read `venue-portal/src/App.tsx` in full.

- [ ] **Step 2: Add the Reports route**

In `App.tsx`, import and add the route alongside existing routes:

```typescript
import Reports from './pages/Reports'
// Add inside the router, alongside existing <Route> elements:
<Route path="/reports" element={<Reports />} />
```

- [ ] **Step 3: Read the nav/layout component**

Find the sidebar/nav component (search for the file containing "Dashboard" and "Promotions" nav links). Read it in full.

- [ ] **Step 4: Add Reports nav link**

Add a Reports nav link between Dashboard and Promotions in the nav component:

```typescript
import { FileText } from 'lucide-react'
// Add nav item:
{ to: '/reports', icon: <FileText size={18} />, label: 'Reports' }
```

- [ ] **Step 5: Run all tests**

```bash
cd venue-portal
npm test
```

Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add venue-portal/src/App.tsx
git commit -m "feat(venue-portal): add Reports route and nav link"
```

---

### Task 6: Create send-monthly-report edge function

**Files:**
- Create: `supabase/functions/send-monthly-report/index.ts`

- [ ] **Step 1: Create the edge function**

Create `supabase/functions/send-monthly-report/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { venueId, reportMonth, pdfUrl } = await req.json() as {
    venueId: string
    reportMonth: string
    pdfUrl: string
  }

  // Fetch venue contact email
  const { data: venue, error } = await supabase
    .from('venues')
    .select('name, email')
    .eq('id', venueId)
    .single()

  if (error || !venue) {
    return new Response(JSON.stringify({ error: 'Venue not found' }), { status: 404 })
  }

  // Generate signed URL for the PDF (1 hour expiry)
  const { data: signed } = await supabase.storage
    .from('venue-reports')
    .createSignedUrl(pdfUrl, 3600)

  const downloadUrl = signed?.signedUrl ?? ''

  // Send email via Resend (or whatever email provider is configured)
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), { status: 500 })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Frendli Reports <reports@frendli.app>',
      to: [venue.email],
      subject: `Your Frendli Monthly Report — ${reportMonth}`,
      html: `
        <h2>Hi ${venue.name},</h2>
        <p>Your monthly foot traffic report for <strong>${reportMonth}</strong> is ready.</p>
        <p><a href="${downloadUrl}">Download your report (PDF)</a></p>
        <p>This link expires in 1 hour. Log in to the Frendli Venue Portal to download it again anytime.</p>
        <p>— The Frendli Team</p>
      `,
    }),
  })

  if (!emailRes.ok) {
    return new Response(JSON.stringify({ error: 'Email send failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/send-monthly-report/index.ts
git commit -m "feat(supabase): add send-monthly-report edge function"
```

---

### Task 7: Create send-monthly-report-batch edge function + pg_cron job

**Files:**
- Create: `supabase/functions/send-monthly-report-batch/index.ts`

- [ ] **Step 1: Create the batch function**

Create `supabase/functions/send-monthly-report-batch/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const today = new Date()
  const todayDay = today.getDate()
  const reportMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().slice(0, 10) // previous month

  // Find venues whose delivery_day matches today and email is enabled
  const { data: settings, error } = await supabase
    .from('venue_report_settings')
    .select('venue_id')
    .eq('email_enabled', true)
    .eq('delivery_day', todayDay)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: { venueId: string; ok: boolean }[] = []

  for (const s of settings ?? []) {
    // Check if report already generated for last month
    const { data: existing } = await supabase
      .from('venue_reports')
      .select('id, pdf_url')
      .eq('venue_id', s.venue_id)
      .eq('report_month', reportMonth)
      .single()

    const pdfUrl = existing?.pdf_url ?? null

    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-monthly-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ venueId: s.venue_id, reportMonth, pdfUrl }),
      }
    )
    results.push({ venueId: s.venue_id, ok: res.ok })
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 })
})
```

- [ ] **Step 2: Register the pg_cron job**

Run this SQL in the Supabase SQL editor (requires pg_cron extension — enable it in Database → Extensions if not already active):

```sql
SELECT cron.schedule(
  'monthly-report-delivery',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-monthly-report-batch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

Note: Set `app.supabase_url` and `app.service_role_key` in Supabase → Settings → Database → Configuration, or use the Vault for secrets.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-monthly-report-batch/index.ts
git commit -m "feat(supabase): add send-monthly-report-batch function and pg_cron schedule"
```
