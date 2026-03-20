import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { staffAuth } from '../lib/staffAuth'

type Tab = 'owner' | 'staff'

export default function Login() {
  const [tab, setTab] = useState<Tab>('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [venueIdInput, setVenueIdInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const navigate = useNavigate()
  useAuth() // subscribe for potential future use

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.session) {
      setError(signInError?.message ?? 'Login failed.')
      setLoading(false)
      return
    }

    // Always navigate to /dashboard after successful login.
    // If registration is incomplete (registration_step < 4), ProtectedRoute in App.tsx
    // intercepts and redirects to the correct wizard step automatically.
    // Do NOT read `venue` here — AuthContext loads it asynchronously after
    // onAuthStateChange fires, so `venue` will be null at this point.
    navigate('/dashboard')
  }

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\d{4}$/.test(pinInput)) { setError('PIN must be a 4-digit number.'); return }
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueIdInput, pin: pinInput }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429 && data.seconds_remaining) {
          setError(`Too many attempts. Try again in ${Math.ceil(data.seconds_remaining / 60)} minutes.`)
        } else {
          setError(data.error ?? 'Invalid PIN.')
        }
        setLoading(false)
        return
      }

      staffAuth.setSession(data.token, venueIdInput)
      navigate('/redeem')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-center text-slate-100 mb-6">
          <span className="text-indigo-400">Frendli</span> Venue Portal
        </h1>

        {/* Tab toggle */}
        <div className="flex rounded-lg bg-slate-900 p-1 mb-6">
          {(['owner', 'staff'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'owner' ? 'Owner Login' : 'Staff Login'}
            </button>
          ))}
        </div>

        {tab === 'owner' ? (
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">Email</span>
              <input
                type="email" aria-label="Email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Password</span>
              <input
                type="password" aria-label="Password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </label>
            {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">Venue ID</span>
              <input
                type="text" aria-label="Venue ID" required value={venueIdInput}
                onChange={(e) => setVenueIdInput(e.target.value)}
                placeholder="Provided by your manager"
                className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">PIN</span>
              <input
                type="password" aria-label="PIN" required value={pinInput}
                maxLength={4} inputMode="numeric"
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 tracking-widest text-center text-2xl"
              />
            </label>
            {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register/1" className="text-indigo-400 hover:underline">
            Register your venue
          </Link>
        </p>
      </div>
    </div>
  )
}
