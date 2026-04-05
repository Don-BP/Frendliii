import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { startOfDay, startOfWeek, subDays, startOfMonth, endOfMonth, format } from 'date-fns'

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
        const h = new Date(r.redeemed_at).getUTCHours()
        hourBuckets[h]++
      }
      const hourlyChart: HourCount[] = Object.entries(hourBuckets).map(([h, c]) => ({
        hour: Number(h),
        count: c,
      }))

      // ── Daily chart (last 30 days) ────────────────────────────────────────
      const countsByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) countsByDay[format(subDays(now, i), 'MM/dd')] = 0
      for (const r of recent) {
        const day = format(new Date(r.redeemed_at), 'MM/dd')
        if (day in countsByDay) countsByDay[day]++
      }
      const dailyChart: DayCount[] = Object.entries(countsByDay).map(([date, count]) => ({ date, count }))

      // ── New vs returning ──────────────────────────────────────────────────
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
        ? Math.round(([...priorWindow30].filter(u => returnedIn30.has(u)).length / priorWindow30.size) * 100)
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
