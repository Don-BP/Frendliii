import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { VenueTier } from '../../../lib/types'

interface TierCard { tier: VenueTier; label: string; price: string; features: string[] }

const TIERS: TierCard[] = [
  {
    tier: 'listed',
    label: 'Listed Partner',
    price: 'Free',
    features: ['Basic listing', 'Visible to users planning hangouts'],
  },
  {
    tier: 'perks',
    label: 'Perks Partner',
    price: '¥12,000/month',
    features: ['First 3 months free', 'Featured badge', 'Coupon program', 'Redemption dashboard'],
  },
  {
    tier: 'premier',
    label: 'Premier Partner',
    price: '¥36,000/month',
    features: ['All Perks features', 'Exclusive category', 'Top of feed', 'Dedicated support'],
  },
]

interface Props { venueId: string; onSuccess: () => void }

export default function Step4Tier({ venueId, onSuccess }: Props) {
  const [selected, setSelected] = useState<VenueTier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    const isPaid = selected !== 'listed'
    const { error: updateError } = await supabase
      .from('venues')
      .update({ tier: selected, tier_payment_status: isPaid ? 'pending' : 'none', registration_step: 4 })
      .eq('id', venueId)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    onSuccess()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h2 className="text-xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Choose your tier</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => setSelected(t.tier)}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selected === t.tier
                ? 'border-[#FF7F61] bg-[#FFF1EE] dark:bg-[#2D1225] shadow-[0_4px_16px_rgba(255,127,97,0.2)]'
                : 'border-[#EEEAE3] dark:border-[#3D2E55] bg-white dark:bg-[#251A38] hover:border-[#FF7F61]/50'
            }`}
          >
            <p className="font-['Bricolage_Grotesque'] font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">{t.label}</p>
            <p className="text-[#FF7F61] text-sm font-medium mt-1">{t.price}</p>
            <ul className="mt-2 space-y-1">
              {t.features.map((f) => (
                <li key={f} className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">• {f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
      {selected && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
        >
          {loading ? 'Saving…' : selected === 'listed' ? 'Complete Registration' : 'Continue to Payment'}
        </button>
      )}
    </div>
  )
}
