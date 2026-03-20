import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { MapPicker } from '../../../components/MapPicker'
import type { MapLocation } from '../../../components/MapPicker'

interface Props { venueId: string; onSuccess: () => void }

export default function Step3Location({ venueId, onSuccess }: Props) {
  const [location, setLocation] = useState<MapLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location) return
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('venues')
      .update({
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        registration_step: 3,
      })
      .eq('id', venueId)

    if (updateError) { setError(updateError.message); setLoading(false); return }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-slate-100">Pin your venue location</h2>
      <p className="text-sm text-slate-400">
        This location is used by SafeArrival and hangout suggestions. You can update it later from your profile.
      </p>

      <MapPicker value={location} onChange={setLocation} />

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!location || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded"
      >
        {loading ? 'Saving…' : 'Next'}
      </button>
    </form>
  )
}
