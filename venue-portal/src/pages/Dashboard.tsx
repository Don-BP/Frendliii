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

      const { data: monthly } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', startOfMonth(now).toISOString())
        .lte('redeemed_at', endOfMonth(now).toISOString())
      setMonthlyCount(monthly?.length ?? 0)

      const { data: allTime } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', new Date(0).toISOString())
        .lte('redeemed_at', now.toISOString())
      setAllTimeCount(allTime?.length ?? 0)

      const { data: promos } = await supabase
        .from('venue_promotions').select('id').eq('venue_id', venueId)
        .eq('is_active', true).gt('valid_until', now.toISOString())
      setActivePromos(promos?.length ?? 0)

      const { data: redemptions } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', subDays(now, 29).toISOString())
        .lte('redeemed_at', now.toISOString())

      const countsByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        countsByDay[format(subDays(now, i), 'MM/dd')] = 0
      }
      for (const r of redemptions ?? []) {
        const day = format(new Date(r.redeemed_at!), 'MM/dd')
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
    { label: 'All-time redemptions',   value: loading ? '—' : allTimeCount },
    { label: 'Active promotions',      value: loading ? '—' : activePromos },
    { label: 'Current tier',           value: loading ? '—' : TIER_LABELS[venue?.tier ?? 'listed'] },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Accent bar */}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.05)]">
            <div className="w-2 h-2 rounded-full bg-[#FF7F61] mb-2" />
            <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mb-1">{c.label}</p>
            <p className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-6 shadow-[0_4px_20px_rgba(45,30,75,0.05)]">
        <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4 font-medium">Redemptions — last 30 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8E8271' }} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: '#8E8271' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#FFFBF7',
                border: '1px solid #EEEAE3',
                color: '#2D1E4B',
                borderRadius: '12px',
              }}
            />
            <Bar dataKey="count" fill="#FF7F61" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
