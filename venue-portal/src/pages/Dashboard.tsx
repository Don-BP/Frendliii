import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

interface DayCount { date: string; count: number }

export default function Dashboard() {
  const { session, venue } = useAuth()
  const venueId = session?.user?.id
  const [monthlyCount, setMonthlyCount] = useState<number>(0)
  const [allTimeCount, setAllTimeCount] = useState<number>(0)
  const [activePromos, setActivePromos] = useState<number>(0)
  const [chartData, setChartData] = useState<DayCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!venueId) return
    const load = async () => {
      const now = new Date()

      // Monthly redemptions
      const { data: monthly } = await supabase
        .from('venue_redemptions')
        .select('redeemed_at')
        .eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', startOfMonth(now).toISOString())
        .lte('redeemed_at', endOfMonth(now).toISOString())
      setMonthlyCount(monthly?.length ?? 0)

      // All-time redemptions
      const { data: allTime } = await supabase
        .from('venue_redemptions')
        .select('redeemed_at')
        .eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', new Date(0).toISOString())
        .lte('redeemed_at', now.toISOString())
      setAllTimeCount(allTime?.length ?? 0)

      // Active promotions
      const { data: promos } = await supabase
        .from('venue_promotions')
        .select('id')
        .eq('venue_id', venueId)
        .is('deleted_at', null)
        .gt('valid_until', now.toISOString())
      setActivePromos(promos?.length ?? 0)

      // Chart: last 30 days
      const { data: redemptions } = await supabase
        .from('venue_redemptions')
        .select('redeemed_at')
        .eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', subDays(now, 29).toISOString())
        .lte('redeemed_at', now.toISOString())

      const countsByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        countsByDay[format(subDays(now, i), 'MM/dd')] = 0
      }
      for (const r of redemptions ?? []) {
        const day = format(new Date(r.redeemed_at), 'MM/dd')
        if (day in countsByDay) countsByDay[day]++
      }
      setChartData(Object.entries(countsByDay).map(([date, count]) => ({ date, count })))
      setLoading(false)
    }
    load()
  }, [venueId])

  const isPendingPayment = venue?.tier !== 'listed' && venue?.tier_payment_status !== 'active'
  const showUpgradeBanner = venue?.tier === 'listed' || isPendingPayment

  const TIER_LABELS: Record<string, string> = {
    listed: 'Listed', perks: 'Perks', premier: 'Premier',
  }

  const cards = [
    { label: 'Redemptions this month', value: loading ? '—' : monthlyCount },
    { label: 'All-time redemptions', value: loading ? '—' : allTimeCount },
    { label: 'Active promotions', value: loading ? '—' : activePromos },
    { label: 'Current tier', value: loading ? '—' : TIER_LABELS[venue?.tier ?? 'listed'] },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Dashboard</h1>

      {showUpgradeBanner && (
        <div className="mb-6 p-4 bg-indigo-950 border border-indigo-700 rounded-lg flex items-center justify-between">
          <p className="text-sm text-indigo-300">
            {isPendingPayment
              ? 'Your payment is pending. Full tier features will unlock once confirmed.'
              : 'Unlock promotions and redemption analytics with Perks or Premier.'}
          </p>
          <button className="ml-4 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded whitespace-nowrap">
            Upgrade
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-slate-100">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-400 mb-4">Redemptions — last 30 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', color: '#f1f5f9' }} />
            <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
