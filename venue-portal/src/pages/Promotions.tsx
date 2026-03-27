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
  const { promotions, loading, createPromotion, updatePromotion, togglePromotion } = usePromotions()
  const [formTarget, setFormTarget] = useState<EditTarget>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!venue) return null

  const handleFormSubmit = async (data: Parameters<typeof createPromotion>[0]) => {
    setActionError(null)
    if (formTarget === 'new') {
      await createPromotion(data)
    } else if (formTarget) {
      await updatePromotion((formTarget as VenuePromotion).id, data)
    }
    setFormTarget(null)
  }

  const handleToggle = async (id: string, current: boolean) => {
    setActionError(null)
    try { await togglePromotion(id, !current) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  const activePromos = promotions.filter(p => p.is_active && new Date(p.valid_until) > new Date())
  const pastPromos = promotions.filter(p => !p.is_active || new Date(p.valid_until) <= new Date())

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Promotions</h1>
        <button
          onClick={() => setFormTarget('new')}
          className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
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
            {actionError && <p className="text-red-500 dark:text-red-400 text-sm">{actionError}</p>}

            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">Active</h2>
              {activePromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No active promotions. Create one above.</p>
                : <div className="space-y-3">{activePromos.map(p => <PromotionCard key={p.id} promotion={p} onEdit={() => setFormTarget(p)} onToggle={() => handleToggle(p.id, p.is_active)} />)}</div>
              }
            </section>

            {pastPromos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">Past / Inactive</h2>
                <div className="space-y-3">{pastPromos.map(p => <PromotionCard key={p.id} promotion={p} onEdit={() => setFormTarget(p)} onToggle={() => handleToggle(p.id, p.is_active)} />)}</div>
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

function PromotionCard({ promotion: p, onEdit, onToggle }: { promotion: VenuePromotion; onEdit: () => void; onToggle: () => void }) {
  const expired = new Date(p.valid_until) <= new Date()
  return (
    <div className={`bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-start justify-between gap-4 shadow-[0_4px_20px_rgba(45,30,75,0.05)] ${!p.is_active || expired ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">{p.title}</p>
        <p className="text-[#FF7F61] text-sm">{p.discount}</p>
        {p.description && <p className="text-[#8E8271] dark:text-[#9E8FC0] text-xs mt-1">{p.description}</p>}
        <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">
          {format(new Date(p.valid_from), 'MMM d, yyyy')} – {format(new Date(p.valid_until), 'MMM d, yyyy')}
          {expired && <span className="ml-2 text-red-500">Expired</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="text-xs text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] px-2 py-1 rounded-lg border border-[#EEEAE3] dark:border-[#3D2E55] hover:border-[#FF7F61]/50 transition-colors">
          Edit
        </button>
        <button onClick={onToggle}
          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${p.is_active ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10' : 'text-[#8E8271] dark:text-[#9E8FC0] border-[#EEEAE3] dark:border-[#3D2E55]'}`}>
          {p.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  )
}
