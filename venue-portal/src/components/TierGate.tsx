import type { Venue } from '../lib/types'

interface Props {
  venue: Venue
  children: React.ReactNode
}

export function TierGate({ venue, children }: Props) {
  const isListed = venue.tier === 'listed'
  const isPending = venue.tier !== 'listed' && venue.tier_payment_status !== 'active'

  if (isListed) {
    return (
      <div className="relative min-h-[200px] flex flex-col items-center justify-center bg-slate-900/80 rounded-lg p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">🔒</p>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Perks or Premier Required</h3>
          <p className="text-sm text-slate-400 mb-4">
            The coupon program is available on Perks and Premier tiers.
          </p>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2 rounded">
            Upgrade Now
          </button>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="relative min-h-[200px] flex flex-col items-center justify-center bg-slate-900/80 rounded-lg p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-3">⏳</p>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Payment Pending</h3>
          <p className="text-sm text-slate-400">
            We'll reach out to confirm your subscription. Promotions will unlock once payment is active.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
