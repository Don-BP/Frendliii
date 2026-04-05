import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardStats } from '../useDashboardStats'

// Hoist mockFrom so it's available inside the vi.mock factory
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

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
    gt: vi.fn().mockReturnThis(),
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
    // Use recent dates (within last 30 days) so they pass the window filter
    const recentDate = (daysAgo: number, hour: number) => {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      d.setUTCHours(hour, 0, 0, 0)
      return d.toISOString()
    }
    const redemptions = [
      { redeemed_at: recentDate(5, 9),  user_id: 'u1', hangout_id: null },
      { redeemed_at: recentDate(3, 9),  user_id: 'u2', hangout_id: null },
      { redeemed_at: recentDate(1, 14), user_id: 'u3', hangout_id: null },
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
