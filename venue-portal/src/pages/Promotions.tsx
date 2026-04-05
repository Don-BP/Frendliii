import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePromotions } from '../hooks/usePromotions'
import { TierGate } from '../components/TierGate'
import { PromotionForm } from '../components/PromotionForm'
import type { VenuePromotion } from '../lib/types'

type EditTarget = VenuePromotion | 'new' | null

export default function Promotions() {
  const { venue } = useAuth()
  const tier = (venue?.tier ?? 'listed') as 'listed' | 'perks' | 'premier'
  const { promotions, loading, canActivate, tierLimit, createPromotion, updatePromotion, activatePromotion, endPromotion } = usePromotions(venue?.id, tier)
  const [formTarget, setFormTarget] = useState<EditTarget>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!venue) return null

  const now = new Date()
  const activePromos = promotions.filter(p => p.status === 'active' && new Date(p.valid_until) > now)
  const draftPromos  = promotions.filter(p => p.status === 'draft')
  const endedPromos  = promotions.filter(p => p.status === 'ended' || (p.status === 'active' && new Date(p.valid_until) <= now))

  const handleFormSubmit = async (data: Parameters<typeof createPromotion>[0]) => {
    setActionError(null)
    if (formTarget === 'new') {
      await createPromotion(data)
    } else if (formTarget) {
      await updatePromotion((formTarget as VenuePromotion).id, data)
    }
    setFormTarget(null)
  }

  const handleActivate = async (id: string) => {
    setActionError(null)
    try { await activatePromotion(id) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  const handleEnd = async (id: string) => {
    setActionError(null)
    try { await endPromotion(id) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Promotions</h1>
        <button
          onClick={() => setFormTarget('new')}
          disabled={!canActivate}
          title={!canActivate ? `You've reached your ${tierLimit} active promotion limit` : undefined}
          className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
        >
          <Plus size={16} />
          New Promotion
        </button>
      </div>

      <TierGate venue={venue}>
        {loading ? (
          <p className="text-[#8E8271] dark:text-[#9E8FC0]">Loading…</p>
        ) : (
          <div className="space-y-6">
            {actionError && (
              <p className="text-red-500 dark:text-red-400 text-sm">{actionError}</p>
            )}

            {!canActivate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  You've reached your {tierLimit} active promotion limit. End a promotion to activate a new one.
                </p>
              </div>
            )}

            {/* Active section */}
            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                Active ({activePromos.length}/{tierLimit})
              </h2>
              {activePromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No active promotions.</p>
                : <div className="space-y-3">
                    {activePromos.map(p => (
                      <PromotionCard key={p.id} promotion={p} onEnd={() => handleEnd(p.id)} />
                    ))}
                  </div>
              }
            </section>

            {/* Draft section */}
            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                Draft
              </h2>
              {draftPromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No draft promotions.</p>
                : <div className="space-y-3">
                    {draftPromos.map(p => (
                      <PromotionCard
                        key={p.id}
                        promotion={p}
                        onEdit={() => setFormTarget(p)}
                        onActivate={() => handleActivate(p.id)}
                        canActivate={canActivate}
                        tierLimit={tierLimit}
                      />
                    ))}
                  </div>
              }
            </section>

            {/* Ended section */}
            {endedPromos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                  Ended
                </h2>
                <div className="space-y-3">
                  {endedPromos.map(p => (
                    <PromotionCard key={p.id} promotion={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </TierGate>

      {formTarget && (
        <PromotionForm
          initial={formTarget === 'new' ? undefined : formTarget as VenuePromotion}
          onSubmit={handleFormSubmit}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  )
}

function PromotionCard({
  promotion: p,
  onEdit,
  onActivate,
  onEnd,
  canActivate,
  tierLimit,
}: {
  promotion: VenuePromotion
  onEdit?: () => void
  onActivate?: () => void
  onEnd?: () => void
  canActivate?: boolean
  tierLimit?: number
}) {
  const expired = new Date(p.valid_until) <= new Date()

  const statusBadge = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    draft:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    ended:  'bg-[#EEEAE3] dark:bg-[#2D1E4B] text-[#8E8271] dark:text-[#9E8FC0]',
  }[p.status]

  return (
    <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-start justify-between gap-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8] truncate">{p.title}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge}`}>
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-[#FF7F61] font-semibold">{p.discount}</p>
        {p.description && <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">{p.description}</p>}
        <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">
          {format(new Date(p.valid_from), 'MMM d, yyyy')} – {format(new Date(p.valid_until), 'MMM d, yyyy')}
          {expired && <span className="ml-2 text-red-500">Expired</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] font-medium transition-colors px-3 py-1.5 rounded-lg border border-[#EEEAE3] dark:border-[#3D2E55]"
          >
            Edit
          </button>
        )}
        {onActivate && (
          <button
            onClick={onActivate}
            disabled={!canActivate}
            title={!canActivate ? `Limit reached (${tierLimit} active max)` : undefined}
            className="text-sm bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Activate
          </button>
        )}
        {onEnd && (
          <button
            onClick={onEnd}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800"
          >
            End
          </button>
        )}
      </div>
    </div>
  )
}
