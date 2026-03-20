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

function toDateInput(iso: string) {
  return iso ? iso.slice(0, 10) : ''
}
function fromDateInput(date: string) {
  return date ? new Date(date).toISOString() : ''
}

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
        title,
        discount,
        description: description || null,
        valid_from: fromDateInput(validFrom),
        valid_until: fromDateInput(validUntil),
        is_active: isActive,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {initial ? 'Edit Promotion' : 'New Promotion'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-400">Title</span>
            <input aria-label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Discount</span>
            <input aria-label="Discount" type="text" value={discount} onChange={(e) => setDiscount(e.target.value)}
              placeholder="e.g. 10% off, Buy 1 Get 1"
              className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">Description (optional)</span>
            <textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-400">Valid from</span>
              <input aria-label="Valid from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Valid until</span>
              <input aria-label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
            </label>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="rounded" />
            <span className="text-sm text-slate-300">Active</span>
          </label>

          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-600 text-slate-300 hover:text-slate-100 font-semibold py-2 rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
