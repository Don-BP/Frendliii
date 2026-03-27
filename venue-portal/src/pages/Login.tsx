import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { staffAuth } from '../lib/staffAuth'

type Tab = 'owner' | 'staff'

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const BTN_PRIMARY = "w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [venueIdInput, setVenueIdInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setResetSent(false)
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
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
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#1A1225] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-8 shadow-[0_4px_20px_rgba(45,30,75,0.08)]">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-center text-[#2D1E4B] dark:text-[#F0EBF8] mb-1">
          <span className="text-[#FF7F61]">Frendli</span> Venue Portal
        </h1>
        <p className="text-center text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-6">Manage your venue partnership</p>

        {/* Tab toggle */}
        <div className="flex rounded-xl bg-[#F5EEE6] dark:bg-[#1A1225] p-1 mb-6">
          {(['owner', 'staff'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setResetSent(false) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t
                  ? 'bg-[#FF7F61] text-white shadow-sm'
                  : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8]'
              }`}
            >
              {t === 'owner' ? 'Owner Login' : 'Staff Login'}
            </button>
          ))}
        </div>

        {tab === 'owner' ? (
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
              <input
                type="email" aria-label="Email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Password</span>
              <input
                type="password" aria-label="Password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                aria-label="Forgot password"
                className="text-xs text-[#FF7F61] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {resetSent && (
              <p className="text-sm text-[#10B981]">Check your email — a reset link is on its way.</p>
            )}
            {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Venue ID</span>
              <input
                type="text" aria-label="Venue ID" required value={venueIdInput}
                onChange={(e) => setVenueIdInput(e.target.value)}
                placeholder="Provided by your manager"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">PIN</span>
              <input
                type="password" aria-label="PIN" required value={pinInput}
                maxLength={4} inputMode="numeric"
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`${INPUT} tracking-widest text-center text-2xl`}
              />
            </label>
            {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#8E8271] dark:text-[#9E8FC0] mt-6">
          Don't have an account?{' '}
          <Link to="/register/1" className="text-[#FF7F61] hover:underline font-medium">
            Register your venue
          </Link>
        </p>
      </div>
    </div>
  )
}
