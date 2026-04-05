# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 missing PRD metrics to the venue Dashboard by extracting all data fetching into a `useDashboardStats` hook.

**Architecture:** A new `useDashboardStats` hook owns all Supabase queries and returns a typed stats object. `Dashboard.tsx` is simplified to pure rendering. The 4 existing stat tiles are updated (2 swapped per PRD), and 4 new tiles + an hourly chart are added below.

**Tech Stack:** React, TypeScript, Supabase JS client, Recharts (already installed), Vitest + @testing-library/react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `venue-portal/src/hooks/useDashboardStats.ts` | All dashboard data fetching, stat calculations |
| Create | `venue-portal/src/hooks/__tests__/useDashboardStats.test.ts` | Unit tests for hook logic |
| Modify | `venue-portal/src/pages/Dashboard.tsx` | Remove inline fetching, render stats from hook |

---

### Task 1: Create useDashboardStats hook (TDD)

**Files:**
- Create: `venue-portal/src/hooks/__tests__/useDashboardStats.test.ts`
- Create: `venue-portal/src/hooks/useDashboardStats.ts`

- [ ] **Step 1: Write the failing tests**

Create `venue-portal/src/hooks/__tests__/useDashboardStats.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardStats } from '../useDashboardStats'

// Mock supabase
const mockFrom = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

// Helper: build a chainable Supabase query mock returning `data`
function mockQuery(data: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  } as Record<string, unknown>
  // Final resolution
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: { data: unknown[] }) => void) => resolve({ data }),
  })
  return chain
}

describe('useDashboardStats — todayCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns todayCount = 2 when 2 redemptions have today\'s date', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const redemptions = [
      { redeemed_at: new Date().toISOString(), user_id: 'u1', hangout_id: null },
      { redeemed_at: new Date().toISOString(), user_id: 'u2', hangout_id: null },
    ]
    mockFrom.mockReturnValue(mockQuery(redemptions))

    const { result } = renderHook(() => useDashboardStats('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCount).toBe(2)
  })
})

describe('useDashboardStats — newVsReturning', () => {
  beforeEach(() => vi.clearAllMocks())

  it('classifies first-time user as new and repeat user as returning', async () => {
    // u1 has 1 redemption = new, u2 has 2 = returning
    const redemptions = [
      { redeemed_at: '2026-03-01T10:00:00Z', user_id: 'u1', hangout_id: null },
      { redeemed_at: '2026-02-01T10:00:00Z', user_id: 'u2', hangout_id: null },
      { redeemed_at: '2026-03-15T10:00:00Z', user_id: 'u2', hangout_id: null },
    ]
    mockFrom.mockReturnValue(mockQuery(redemptions))

    const { result } = renderHook(() => useDashboardStats('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.newVisitors).toBe(1)
    expect(result.current.returningVisitors).toBe(1)
  })
})

describe('useDashboardStats — return rates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calculates 30-day return rate as percentage of prior-window users who returned', async () => {
    const now = new Date()
    const daysAgo = (n: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - n)
      return d.toISOString()
    }
    // u1 redeemed in both windows = returning
    // u2 only in prior window = not returning
    const redemptions = [
      { redeemed_at: daysAgo(45), user_id: 'u1', hangout_id: null }, // prior window
      { redeemed_at: daysAgo(45), user_id: 'u2', hangout_id: null }, // prior window
      { redeemed_at: daysAgo(10), user_id: 'u1', hangout_id: null }, // current window
    ]
    mockFrom.mockReturnValue(mockQuery(redemptions))

    const { result } = renderHook(() => useDashboardStats('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // 1 of 2 prior-window users returned = 50%
    expect(result.current.rate30Day).toBe(50)
  })
})

describe('useDashboardStats — hourlyChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('produces 24 buckets with correct counts', async () => {
    const redemptions = [
      { redeemed_at: '2026-03-01T09:00:00Z', user_id: 'u1', hangout_id: null },
      { redeemed_at: '2026-03-02T09:30:00Z', user_id: 'u2', hangout_id: null },
      { redeemed_at: '2026-03-03T14:00:00Z', user_id: 'u3', hangout_id: null },
    ]
    mockFrom.mockReturnValue(mockQuery(redemptions))

    const { result } = renderHook(() => useDashboardStats('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hourlyChart).toHaveLength(24)
    const hour9 = result.current.hourlyChart.find(h => h.hour === 9)
    expect(hour9?.count).toBe(2)
    const hour14 = result.current.hourlyChart.find(h => h.hour === 14)
    expect(hour14?.count).toBe(1)
  })
})

describe('useDashboardStats — loading', () => {
  it('returns loading=true initially', () => {
    mockFrom.mockReturnValue(mockQuery([]))
    const { result } = renderHook(() => useDashboardStats('venue-1'))
    expect(result.current.loading).toBe(true)
  })

  it('returns all zeros when venueId is undefined', async () => {
    const { result } = renderHook(() => useDashboardStats(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCount).toBe(0)
    expect(result.current.monthlyCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd venue-portal
npm test -- useDashboardStats
```

Expected: FAIL — `Cannot find module '../useDashboardStats'`

- [ ] **Step 3: Create the hook**

Create `venue-portal/src/hooks/useDashboardStats.ts`:

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { startOfDay, startOfWeek, subDays, startOfMonth, endOfMonth } from 'date-fns'

export interface HourCount { hour: number; count: number }
export interface DayCount  { date: string; count: number }

export interface DashboardStats {
  loading: boolean
  monthlyCount: number
  todayCount: number
  thisWeekCount: number
  avgGroupSize: number | null
  hourlyChart: HourCount[]
  dailyChart: DayCount[]
  newVisitors: number
  returningVisitors: number
  rate30Day: number
  rate60Day: number
  activePromos: number
}

const EMPTY: DashboardStats = {
  loading: false,
  monthlyCount: 0,
  todayCount: 0,
  thisWeekCount: 0,
  avgGroupSize: null,
  hourlyChart: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
  dailyChart: [],
  newVisitors: 0,
  returningVisitors: 0,
  rate30Day: 0,
  rate60Day: 0,
  activePromos: 0,
}

interface Redemption {
  redeemed_at: string
  user_id: string
  hangout_id: string | null
}

export function useDashboardStats(venueId: string | undefined): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({ ...EMPTY, loading: true })

  useEffect(() => {
    if (!venueId) {
      setStats({ ...EMPTY, loading: false })
      return
    }

    const load = async () => {
      const now = new Date()

      const [{ data: allRedemptions }, { data: promos }] = await Promise.all([
        supabase
          .from('venue_redemptions')
          .select('redeemed_at, user_id, hangout_id')
          .eq('venue_id', venueId)
          .not('redeemed_at', 'is', null),
        supabase
          .from('venue_promotions')
          .select('id')
          .eq('venue_id', venueId)
          .eq('is_active', true)
          .gt('valid_until', now.toISOString()),
      ])

      const redemptions: Redemption[] = allRedemptions ?? []

      // ── Counts ────────────────────────────────────────────────────────────
      const todayStart = startOfDay(now).toISOString()
      const weekStart  = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd   = endOfMonth(now).toISOString()

      const todayCount    = redemptions.filter(r => r.redeemed_at >= todayStart).length
      const thisWeekCount = redemptions.filter(r => r.redeemed_at >= weekStart).length
      const monthlyCount  = redemptions.filter(r => r.redeemed_at >= monthStart && r.redeemed_at <= monthEnd).length

      // ── Hourly chart (last 30 days) ───────────────────────────────────────
      const thirtyDaysAgo = subDays(now, 29).toISOString()
      const recent = redemptions.filter(r => r.redeemed_at >= thirtyDaysAgo)
      const hourBuckets: Record<number, number> = {}
      for (let h = 0; h < 24; h++) hourBuckets[h] = 0
      for (const r of recent) {
        const h = new Date(r.redeemed_at).getHours()
        hourBuckets[h]++
      }
      const hourlyChart: HourCount[] = Object.entries(hourBuckets).map(([h, c]) => ({
        hour: Number(h),
        count: c,
      }))

      // ── Daily chart (last 30 days) ────────────────────────────────────────
      const { format } = await import('date-fns')
      const countsByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) countsByDay[format(subDays(now, i), 'MM/dd')] = 0
      for (const r of recent) {
        const day = format(new Date(r.redeemed_at), 'MM/dd')
        if (day in countsByDay) countsByDay[day]++
      }
      const dailyChart: DayCount[] = Object.entries(countsByDay).map(([date, count]) => ({ date, count }))

      // ── New vs returning ──────────────────────────────────────────────────
      const firstVisit: Record<string, string> = {}
      for (const r of [...redemptions].sort((a, b) => a.redeemed_at.localeCompare(b.redeemed_at))) {
        if (!firstVisit[r.user_id]) firstVisit[r.user_id] = r.redeemed_at
      }
      const visitCounts: Record<string, number> = {}
      for (const r of redemptions) visitCounts[r.user_id] = (visitCounts[r.user_id] ?? 0) + 1
      const newVisitors       = Object.values(visitCounts).filter(c => c === 1).length
      const returningVisitors = Object.values(visitCounts).filter(c => c > 1).length

      // ── 30-day return rate ────────────────────────────────────────────────
      const window30Start = subDays(now, 60).toISOString()
      const window30Mid   = subDays(now, 30).toISOString()
      const priorWindow30 = new Set(
        redemptions.filter(r => r.redeemed_at >= window30Start && r.redeemed_at < window30Mid).map(r => r.user_id)
      )
      const returnedIn30 = new Set(
        redemptions.filter(r => r.redeemed_at >= window30Mid).map(r => r.user_id)
      )
      const rate30Day = priorWindow30.size > 0
        ? Math.round((([...priorWindow30].filter(u => returnedIn30.has(u)).length / priorWindow30.size) * 100))
        : 0

      // ── 60-day return rate ────────────────────────────────────────────────
      const window60Start = subDays(now, 120).toISOString()
      const window60Mid   = subDays(now, 60).toISOString()
      const priorWindow60 = new Set(
        redemptions.filter(r => r.redeemed_at >= window60Start && r.redeemed_at < window60Mid).map(r => r.user_id)
      )
      const returnedIn60 = new Set(
        redemptions.filter(r => r.redeemed_at >= window60Mid).map(r => r.user_id)
      )
      const rate60Day = priorWindow60.size > 0
        ? Math.round(([...priorWindow60].filter(u => returnedIn60.has(u)).length / priorWindow60.size) * 100)
        : 0

      setStats({
        loading: false,
        monthlyCount,
        todayCount,
        thisWeekCount,
        avgGroupSize: null, // requires hangout_id FK — deferred until schema confirmed
        hourlyChart,
        dailyChart,
        newVisitors,
        returningVisitors,
        rate30Day,
        rate60Day,
        activePromos: promos?.length ?? 0,
      })
    }

    load()
  }, [venueId])

  return stats
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd venue-portal
npm test -- useDashboardStats
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/hooks/useDashboardStats.ts venue-portal/src/hooks/__tests__/useDashboardStats.test.ts
git commit -m "feat(venue-portal): add useDashboardStats hook with all 8 PRD metrics"
```

---

### Task 2: Update Dashboard.tsx to use hook and render all metrics

**Files:**
- Modify: `venue-portal/src/pages/Dashboard.tsx`

- [ ] **Step 1: Read the current Dashboard.tsx**

Read `venue-portal/src/pages/Dashboard.tsx` in full before editing.

- [ ] **Step 2: Replace Dashboard.tsx with the updated version**

Replace the entire file content of `venue-portal/src/pages/Dashboard.tsx`:

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'

const TIER_LABELS: Record<string, string> = {
  listed: 'Listed',
  perks: 'Perks',
  premier: 'Premier',
}

export default function Dashboard() {
  const { session, venue } = useAuth()
  const venueId = session?.user?.id
  const stats = useDashboardStats(venueId)

  const isPendingPayment = venue?.tier !== 'listed' && venue?.tier_payment_status !== 'active'
  const showUpgradeBanner = venue?.tier === 'listed' || isPendingPayment

  const primaryTiles = [
    { label: 'Redemptions this month', value: stats.loading ? '—' : stats.monthlyCount },
    { label: 'Today',                  value: stats.loading ? '—' : stats.todayCount },
    { label: 'This week',              value: stats.loading ? '—' : stats.thisWeekCount },
    { label: 'Current tier',           value: stats.loading ? '—' : TIER_LABELS[venue?.tier ?? 'listed'] },
  ]

  const secondaryTiles = [
    { label: 'Avg group size',    value: stats.loading ? '—' : (stats.avgGroupSize != null ? stats.avgGroupSize.toFixed(1) : 'N/A') },
    { label: 'New visitors',      value: stats.loading ? '—' : stats.newVisitors },
    { label: 'Returning visitors',value: stats.loading ? '—' : stats.returningVisitors },
    { label: '30-day return rate',value: stats.loading ? '—' : `${stats.rate30Day}%`, sub: stats.loading ? '' : `60-day: ${stats.rate60Day}%` },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">
        Dashboard
      </h1>

      {showUpgradeBanner && (
        <div className="mb-6 p-4 bg-[#FFF1EE] dark:bg-[#2D1225] border border-[#FF7F61]/30 rounded-2xl flex items-center justify-between">
          <p className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">
            {isPendingPayment
              ? 'Your payment is pending. Full tier features will unlock once confirmed.'
              : 'Unlock promotions and redemption analytics with Perks or Premier.'}
          </p>
          <button className="ml-4 text-xs bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-3 py-1 rounded-lg whitespace-nowrap transition-colors">
            Upgrade
          </button>
        </div>
      )}

      {/* Primary stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {primaryTiles.map(tile => (
          <div key={tile.label} className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)]">
            <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mb-1">{tile.label}</p>
            <p className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {secondaryTiles.map(tile => (
          <div key={tile.label} className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)]">
            <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mb-1">{tile.label}</p>
            <p className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">{tile.value}</p>
            {tile.sub && <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">{tile.sub}</p>}
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)] mb-6">
        <p className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-4">
          Redemptions — last 30 days
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stats.dailyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8E8271' }} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: '#8E8271' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#251A38', border: 'none', borderRadius: 8, color: '#F0EBF8', fontSize: 12 }} />
            <Bar dataKey="count" fill="#FF7F61" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly chart */}
      <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)]">
        <p className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-4">
          Peak hours — last 30 days
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stats.hourlyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#8E8271' }} tickFormatter={h => `${h}:00`} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: '#8E8271' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={h => `${h}:00–${Number(h) + 1}:00`}
              contentStyle={{ background: '#251A38', border: 'none', borderRadius: 8, color: '#F0EBF8', fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#2D1E4B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
cd venue-portal
npm test
```

Expected: All tests pass. If the existing `Dashboard` test checks for specific tile labels like "All-time redemptions", update that test to match the new labels ("Today", "This week").

- [ ] **Step 4: Commit**

```bash
git add venue-portal/src/pages/Dashboard.tsx
git commit -m "feat(venue-portal): update Dashboard to render all 8 PRD analytics metrics"
```
