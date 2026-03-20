import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVenue } from '../hooks/useVenue'
import { useAuth } from '../contexts/AuthContext'
import { MapPicker } from '../components/MapPicker'
import { HoursEditor, DEFAULT_HOURS } from '../components/HoursEditor'
import type { MapLocation } from '../components/MapPicker'
import type { VenueCategory, VenueHours } from '../lib/types'

const CATEGORIES = [
  { value: 'cafe', label: 'Café' }, { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' }, { value: 'bowling_alley', label: 'Bowling Alley' },
  { value: 'karaoke', label: 'Karaoke' }, { value: 'escape_room', label: 'Escape Room' },
  { value: 'activity_venue', label: 'Activity Venue' }, { value: 'other', label: 'Other' },
]

export default function Profile() {
  const { session } = useAuth()
  const { venue, loading, updateVenue } = useVenue()
  const venueId = session?.user?.id ?? ''

  // Details state
  const [name, setName] = useState('')
  const [category, setCategory] = useState<VenueCategory>('other')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<VenueHours>(DEFAULT_HOURS)
  const [location, setLocation] = useState<MapLocation | null>(null)

  // Save state
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from loaded venue
  useEffect(() => {
    if (!venue) return
    setName(venue.name)
    setCategory(venue.category)
    setPhone(venue.phone ?? '')
    setEmail(venue.email ?? '')
    setWebsite(venue.website ?? '')
    setDescription(venue.description ?? '')
    setHours(venue.hours ?? DEFAULT_HOURS)
    if (venue.lat != null && venue.lng != null) {
      setLocation({ lat: venue.lat, lng: venue.lng, address: venue.address ?? '' })
    } else if (venue.address) {
      setLocation({ lat: null, lng: null, address: venue.address })
    }
  }, [venue])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    if (!name.trim()) { setSaveError('Venue name is required.'); return }
    setSaving(true)
    try {
      await updateVenue({
        name, category, phone, email, website, description, hours,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        address: location?.address ?? null,
      })
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    const path = `${venueId}/${type}`
    const { error } = await supabase.storage.from('venue-assets').upload(path, file, { upsert: true })
    if (error) { setSaveError(error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('venue-assets').getPublicUrl(path)
    await updateVenue(type === 'logo' ? { logo_url: publicUrl } : { cover_url: publicUrl })
  }

  if (loading) return <div className="p-6 text-slate-400">Loading…</div>

  const showLocationPrompt = venue?.lat == null  // == null catches both null and undefined; lat=0 is valid

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Venue Profile</h1>
      <form onSubmit={handleSave} className="space-y-8">

        {/* Section 1: Branding */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Branding</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-400">Logo</span>
              {venue?.logo_url && <img src={venue.logo_url} alt="Logo" className="w-16 h-16 rounded object-cover mb-2" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                className="mt-1 text-sm text-slate-400 block" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Cover photo</span>
              {venue?.cover_url && <img src={venue.cover_url} alt="Cover" className="w-full h-20 rounded object-cover mb-2" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                className="mt-1 text-sm text-slate-400 block" />
            </label>
          </div>
        </section>

        {/* Section 2: Details */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Details</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">Venue name *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as VenueCategory)}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-400">Phone</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-slate-400">Website</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Description (max 300 chars)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
              <span className="text-xs text-slate-500">{description.length}/300</span>
            </label>
          </div>
        </section>

        {/* Section 3: Location */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Location</h2>
          {showLocationPrompt && (
            <p className="text-amber-400 text-sm mb-3">
              Pin your location to enable SafeArrival precision and hangout suggestions.
            </p>
          )}
          <MapPicker value={location} onChange={setLocation} />
        </section>

        {/* Section 4: Hours */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Operating hours</h2>
          <HoursEditor value={hours} onChange={setHours} />
        </section>

        {saveError && <p role="alert" className="text-red-400 text-sm">{saveError}</p>}
        {saveSuccess && <p className="text-emerald-400 text-sm">Changes saved!</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Section 5: Staff Access — stub, implemented in Plan 5 */}
      <div className="mt-8 p-4 bg-slate-800 rounded-lg">
        <h2 className="text-lg font-semibold text-slate-200 mb-2">Staff Access</h2>
        <p className="text-sm text-slate-400">Staff PIN management — available after Plan 5 is deployed.</p>
      </div>

      {/* Section 6: Tier */}
      <div className="mt-4 p-4 bg-slate-800 rounded-lg">
        <h2 className="text-lg font-semibold text-slate-200 mb-2">Tier</h2>
        <p className="text-sm text-slate-300">
          Current tier: <span className="font-semibold text-indigo-400 capitalize">{venue?.tier}</span>
          {venue?.tier_payment_status === 'pending' && (
            <span className="ml-2 text-amber-400 text-xs">(Payment Pending)</span>
          )}
        </p>
        <button className="mt-3 text-sm text-indigo-400 hover:underline">Upgrade / Contact Us</button>
      </div>
    </div>
  )
}
