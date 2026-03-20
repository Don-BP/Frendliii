import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface Props { onSuccess: () => void }

export default function Step1Account({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Sign up failed')
      setLoading(false)
      return
    }

    // Insert stub venues row — registration_step = 1
    const { error: insertError } = await supabase.from('venues').insert({
      id: data.user.id,
      name: '',
      category: 'other',
      registration_step: 1,
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-slate-100">Create your account</h2>

      <label className="block">
        <span className="text-sm text-slate-400">Email</span>
        <input
          type="email" aria-label="Email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Password</span>
        <input
          type="password" aria-label="Password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Confirm password</span>
        <input
          type="password" aria-label="Confirm password" required value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </label>

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit" disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}
