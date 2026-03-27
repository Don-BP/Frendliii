import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVenue } from '../hooks/useVenue'
import { useAuth } from '../contexts/AuthContext'
import { MapPicker } from '../components/MapPicker'
import { HoursEditor, DEFAULT_HOURS } from '../components/HoursEditor'
import { ThemeToggle } from '../components/ThemeToggle'
import type { MapLocation } from '../components/MapPicker'
import type { Venue, VenueCategory, VenueHours } from '../lib/types'

const INPUT = "w-full mt-1 bg-white dark:bg-[#1A1225] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const CARD = "bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-6"
const SECTION_TITLE = "text-base font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-4"

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

  const [name, setName] = useState('')
  const [category, setCategory] = useState<VenueCategory>('other')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<VenueHours>(DEFAULT_HOURS)
  const [location, setLocation] = useState<MapLocation | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

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
        lat: location?.lat ?? null, lng: location?.lng ?? null, address: location?.address ?? null,
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

  if (loading) return <div className="p-6 text-[#8E8271] dark:text-[#9E8FC0]">Loading…</div>

  const showLocationPrompt = venue?.lat == null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />
      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">Venue Profile</h1>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Branding */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Branding</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Logo</span>
              {venue?.logo_url && <img src={venue.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover mb-2 mt-1" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                className="mt-1 text-sm text-[#8E8271] dark:text-[#9E8FC0] block" />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Cover photo</span>
              {venue?.cover_url && <img src={venue.cover_url} alt="Cover" className="w-full h-20 rounded-xl object-cover mb-2 mt-1" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                className="mt-1 text-sm text-[#8E8271] dark:text-[#9E8FC0] block" />
            </label>
          </div>
        </div>

        {/* Details */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Details</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Venue name *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as VenueCategory)} className={INPUT}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Phone</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
              </label>
              <label className="block">
                <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Website</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Description (max 300 chars)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                rows={3} className={INPUT + ' resize-none'} />
              <span className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">{description.length}/300</span>
            </label>
          </div>
        </div>

        {/* Location */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Location</h2>
          {showLocationPrompt && (
            <p className="text-[#FF7F61] text-sm mb-3">
              📍 Pin your location to enable SafeArrival precision and hangout suggestions.
            </p>
          )}
          <MapPicker value={location} onChange={setLocation} />
        </div>

        {/* Hours */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Operating hours</h2>
          <HoursEditor value={hours} onChange={setHours} />
        </div>

        {saveError && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{saveError}</p>}
        {saveSuccess && <p className="text-[#10B981] text-sm">Changes saved!</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Staff Access */}
      {venue && <StaffPinSection venueId={venueId} venue={venue} />}

      {/* Tier */}
      <div className={`mt-4 ${CARD}`}>
        <h2 className={SECTION_TITLE}>Tier</h2>
        <p className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">
          Current tier:{' '}
          <span className="inline-block bg-[#FFF1EE] dark:bg-[#2D1225] text-[#FF7F61] font-semibold px-2 py-0.5 rounded-lg text-xs capitalize">
            {venue?.tier}
          </span>
          {venue?.tier_payment_status === 'pending' && (
            <span className="ml-2 text-amber-500 dark:text-amber-400 text-xs">(Payment Pending)</span>
          )}
        </p>
        <button className="mt-3 text-sm text-[#FF7F61] hover:underline font-medium">Upgrade / Contact Us</button>
      </div>

      {/* Appearance */}
      <div className={`mt-4 ${CARD}`}>
        <h2 className={SECTION_TITLE}>Appearance</h2>
        <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-3">Choose between light and dark mode.</p>
        <div className="max-w-xs">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

export function StaffPinSection({ venueId, venue }: { venueId: string; venue: Venue }) {
  const { session } = useAuth()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState(false)
  const [savingPin, setSavingPin] = useState(false)

  const isLocked = venue.staff_pin_locked_until && new Date(venue.staff_pin_locked_until) > new Date()

  const INPUT_PIN = "w-full mt-1 bg-white dark:bg-[#1A1225] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setPinSuccess(false)
    if (!/^\d{4}$/.test(pin)) { setPinError('PIN must be exactly 4 digits.'); return }
    if (pin !== confirmPin) { setPinError('PINs do not match.'); return }
    setSavingPin(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/update-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ new_pin: pin }),
      })
      const data = await res.json()
      if (!res.ok) { setPinError(data.error ?? 'Failed to update PIN.'); return }
      setPin(''); setConfirmPin(''); setPinSuccess(true)
    } catch {
      setPinError('Network error.')
    } finally {
      setSavingPin(false)
    }
  }

  return (
    <div className="mt-4 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-6">
      <h2 className="text-base font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-1">🔒 Staff Access</h2>
      <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4">
        Set a 4-digit PIN for staff to access the Redemption page. The PIN is never stored in plain text.
      </p>
      {isLocked && (
        <p className="text-amber-500 dark:text-amber-400 text-sm mb-3">
          PIN entry is locked due to too many failed attempts.
        </p>
      )}
      <form onSubmit={handleSetPin} className="space-y-3 max-w-xs">
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">New PIN</span>
          <input type="password" value={pin} maxLength={4} inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={INPUT_PIN} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Confirm PIN</span>
          <input type="password" value={confirmPin} maxLength={4} inputMode="numeric"
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={INPUT_PIN} />
        </label>
        {pinError && <p className="text-red-500 dark:text-red-400 text-sm">{pinError}</p>}
        {pinSuccess && <p className="text-[#10B981] text-sm">PIN updated successfully!</p>}
        <button type="submit" disabled={savingPin}
          className="bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
          {savingPin ? 'Saving…' : venue.staff_pin_hash ? 'Update PIN' : 'Set PIN'}
        </button>
      </form>
      {venue.staff_pin_hash && (
        <p className="mt-3 text-xs text-[#8E8271] dark:text-[#9E8FC0]">
          Share your Venue ID (<span className="font-mono text-[#2D1E4B] dark:text-[#F0EBF8]">{venueId}</span>) and the PIN with your staff.
        </p>
      )}
    </div>
  )
}
