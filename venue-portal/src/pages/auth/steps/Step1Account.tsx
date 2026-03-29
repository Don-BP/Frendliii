import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const BTN = "w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"

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
    <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 max-w-md mx-auto">
      <h2 className="text-xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
          <input type="email" aria-label="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Password</span>
          <input type="password" aria-label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Confirm password</span>
          <input type="password" aria-label="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
        </label>
        {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className={BTN}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
