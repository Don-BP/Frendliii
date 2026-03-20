import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { HoursEditor, DEFAULT_HOURS } from '../../../components/HoursEditor'
import type { VenueCategory, VenueHours } from '../../../lib/types'

const CATEGORIES: { value: VenueCategory; label: string }[] = [
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bowling_alley', label: 'Bowling Alley' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'escape_room', label: 'Escape Room' },
  { value: 'activity_venue', label: 'Activity Venue' },
  { value: 'other', label: 'Other' },
]

interface Props { venueId: string; onSuccess: () => void }

export default function Step2Details({ venueId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<VenueCategory>('other')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<VenueHours>(DEFAULT_HOURS)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Venue name is required.'); return }
    setLoading(true)

    let logo_url: string | undefined
    if (logoFile) {
      const path = `${venueId}/logo`
      const { error: uploadError } = await supabase.storage.from('venue-assets').upload(path, logoFile, { upsert: true })
      if (uploadError) { setError(uploadError.message); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('venue-assets').getPublicUrl(path)
      logo_url = publicUrl
    }

    const { error: updateError } = await supabase
      .from('venues')
      .update({ name, category, phone, description, hours, logo_url, registration_step: 2 })
      .eq('id', venueId)

    if (updateError) { setError(updateError.message); setLoading(false); return }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-slate-100">Venue details</h2>

      <label className="block">
        <span className="text-sm text-slate-400">Venue name *</span>
        <input aria-label="Venue name" type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as VenueCategory)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Phone</span>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Description (max 300 chars)</span>
        <textarea aria-label="Description" value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 300))}
          rows={3}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
        <span className="text-xs text-slate-500">{description.length}/300</span>
      </label>

      <div>
        <p className="text-sm text-slate-400 mb-2">Operating hours</p>
        <HoursEditor value={hours} onChange={setHours} />
      </div>

      <label className="block">
        <span className="text-sm text-slate-400">Logo (optional)</span>
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-sm text-slate-400" />
      </label>

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded">
        {loading ? 'Saving…' : 'Next'}
      </button>
    </form>
  )
}
