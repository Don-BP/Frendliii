import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { VenueTier } from '../../../lib/types'

interface TierCard {
  tier: VenueTier
  label: string
  price: string
  features: string[]
}

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

interface Props {
  venueId: string
  onSuccess: () => void
}

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
      .update({
        tier: selected,
        tier_payment_status: isPaid ? 'pending' : 'none',
        registration_step: 4,
      })
      .eq('id', venueId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-slate-100">Choose your tier</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => setSelected(t.tier)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              selected === t.tier
                ? 'border-indigo-500 bg-indigo-950'
                : 'border-slate-600 bg-slate-800 hover:border-slate-500'
            }`}
          >
            <p className="font-semibold text-slate-100">{t.label}</p>
            <p className="text-indigo-400 text-sm font-medium mt-1">{t.price}</p>
            <ul className="mt-2 space-y-1">
              {t.features.map((f) => (
                <li key={f} className="text-xs text-slate-400">
                  • {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-red-400 text-sm">
          {error}
        </p>
      )}

      {selected && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded"
        >
          {loading
            ? 'Saving…'
            : selected === 'listed'
              ? 'Complete Registration'
              : 'Continue to Payment'}
        </button>
      )}
    </div>
  )
}
