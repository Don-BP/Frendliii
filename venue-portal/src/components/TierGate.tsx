import type { Venue } from '../lib/types'

interface Props { venue: Venue; children: React.ReactNode }

export function TierGate({ venue, children }: Props) {
  const isListed = venue.tier === 'listed'
  const isPending = venue.tier_payment_status !== 'active'

  if (isListed) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#FFFBF7]/90 dark:bg-[#1A1225]/90 rounded-2xl p-6 min-h-[200px]">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-3">🔒</p>
          <h3 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-2">
            Perks or Premier Required
          </h3>
          <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4">
            The coupon program is available on Perks and Premier tiers.
          </p>
          <button className="bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-6 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
            Upgrade Now
          </button>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center bg-[#FFFBF7]/90 dark:bg-[#1A1225]/90 rounded-2xl p-6 min-h-[200px]">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-3">⏳</p>
          <h3 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-2">
            Payment Pending
          </h3>
          <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">
            We'll reach out to confirm your subscription. Promotions will unlock once payment is active.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
