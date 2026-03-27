import { useState } from 'react'
import type { VenuePromotion } from '../lib/types'

type FormData = Pick<VenuePromotion, 'title' | 'discount' | 'valid_from' | 'valid_until'> & {
  description?: string | null
  is_active?: boolean
}

interface Props {
  initial?: FormData
  onSubmit: (data: FormData) => Promise<void>
  onClose: () => void
}

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"

function toDateInput(iso: string) { return iso ? iso.slice(0, 10) : '' }
function fromDateInput(date: string) { return date ? new Date(date).toISOString() : '' }

export function PromotionForm({ initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [discount, setDiscount] = useState(initial?.discount ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [validFrom, setValidFrom] = useState(toDateInput(initial?.valid_from ?? ''))
  const [validUntil, setValidUntil] = useState(toDateInput(initial?.valid_until ?? ''))
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Title is required.'); return }
    if (!discount.trim()) { setError('Discount is required.'); return }
    if (!validFrom || !validUntil) { setError('Valid from and until dates are required.'); return }
    if (new Date(validUntil) <= new Date(validFrom)) { setError('Valid until must be after valid from.'); return }
    setLoading(true)
    try {
      await onSubmit({
        title, discount, description: description || null,
        valid_from: fromDateInput(validFrom), valid_until: fromDateInput(validUntil), is_active: isActive,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-[#FFFBF7] dark:bg-[#1A1225] border-l border-[#EEEAE3] dark:border-[#3D2E55] h-full overflow-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">
            {initial ? 'Edit Promotion' : 'New Promotion'}
          </h2>
          <button onClick={onClose} className="text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Title</span>
            <input aria-label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Discount</span>
            <input aria-label="Discount" type="text" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 10% off, Buy 1 Get 1" className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Description (optional)</span>
            <textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT + ' resize-none'} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Valid from</span>
              <input aria-label="Valid from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Valid until</span>
              <input aria-label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded accent-[#FF7F61]" />
            <span className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">Active</span>
          </label>
          {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[#EEEAE3] dark:border-[#3D2E55] text-[#2D1E4B] dark:text-[#C4B5E8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] font-semibold py-2 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
