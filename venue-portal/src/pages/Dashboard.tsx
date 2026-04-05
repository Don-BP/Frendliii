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
    { label: 'Avg group size',     value: stats.loading ? '—' : (stats.avgGroupSize != null ? stats.avgGroupSize.toFixed(1) : 'N/A') },
    { label: 'New visitors',       value: stats.loading ? '—' : stats.newVisitors },
    { label: 'Returning visitors', value: stats.loading ? '—' : stats.returningVisitors },
    { label: '30-day return rate', value: stats.loading ? '—' : `${stats.rate30Day}%`, sub: stats.loading ? '' : `60-day: ${stats.rate60Day}%` },
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
            {'sub' in tile && tile.sub && <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">{tile.sub}</p>}
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
