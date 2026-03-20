import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { staffFetch, StaffSessionExpiredError } from '../lib/staffAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const VALID_CHARS = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')

type RedeemStatus =
  | { status: 'valid'; promotion_title: string; discount: string; valid_until: string }
  | { status: 'already_redeemed'; promotion_title: string; discount: string; redeemed_at: string }
  | { status: 'invalid' | 'expired'; promotion_title?: string }
  | { status: 'confirmed'; promotion_title: string; discount: string }

type UiState = 'input' | 'check_result' | 'confirmed'

export default function Redemption() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [uiState, setUiState] = useState<UiState>('input')
  const [checkResult, setCheckResult] = useState<RedeemStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCodeChange = (raw: string) => {
    const cleaned = raw.toUpperCase().split('').filter(c => VALID_CHARS.has(c)).slice(0, 6).join('')
    setCode(cleaned)
  }

  const handleCheckCode = async () => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, { code, action: 'check' }) as RedeemStatus
      setCheckResult(data)
      setUiState('check_result')
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        navigate('/login', { state: { expiredMessage: 'Your session has expired. Please enter the PIN to continue.' } })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, { code, action: 'confirm' }) as RedeemStatus
      setCheckResult(data)
      setUiState('confirmed')
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        navigate('/login', { state: { expiredMessage: 'Your session has expired. Please enter the PIN to continue.' } })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCode('')
    setCheckResult(null)
    setUiState('input')
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-100 text-center mb-8">Redeem Coupon</h1>

        {/* Code Input */}
        {uiState === 'input' && (
          <div className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-4 text-slate-100 text-3xl text-center tracking-widest font-mono uppercase focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCheckCode}
              disabled={code.length !== 6 || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 text-lg rounded-xl"
            >
              {loading ? 'Checking…' : 'Check Code'}
            </button>
          </div>
        )}

        {/* Check result */}
        {uiState === 'check_result' && checkResult && (
          <div className="space-y-4">
            {checkResult.status === 'valid' && (
              <div className="bg-emerald-900 border border-emerald-600 rounded-xl p-6 text-center">
                <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider mb-1">Valid Code</p>
                <p className="text-white text-xl font-bold">{checkResult.promotion_title}</p>
                <p className="text-emerald-300 text-lg mt-1">{checkResult.discount}</p>
                <p className="text-emerald-500 text-xs mt-2">
                  Expires {format(new Date(checkResult.valid_until), 'MMM d, yyyy')}
                </p>
              </div>
            )}

            {checkResult.status === 'already_redeemed' && (
              <div className="bg-red-900 border border-red-600 rounded-xl p-6 text-center">
                <p className="text-red-300 text-sm font-semibold uppercase tracking-wider mb-1">Already Redeemed</p>
                <p className="text-white text-xl font-bold">{checkResult.promotion_title}</p>
                <p className="text-red-400 text-sm mt-2">
                  Redeemed at {format(new Date(checkResult.redeemed_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}

            {(checkResult.status === 'invalid' || checkResult.status === 'expired') && (
              <div className="bg-red-900 border border-red-600 rounded-xl p-6 text-center">
                <p className="text-red-300 text-sm font-semibold uppercase tracking-wider mb-1">
                  {checkResult.status === 'expired' ? 'Expired Code' : 'Invalid Code'}
                </p>
                <p className="text-slate-300 text-sm mt-2">
                  {checkResult.status === 'expired'
                    ? 'This promotion has expired.'
                    : 'This code is not valid for your venue.'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 border border-slate-600 text-slate-300 font-semibold py-3 rounded-xl">
                Try Another
              </button>
              {checkResult.status === 'valid' && (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
                >
                  {loading ? 'Confirming…' : 'Confirm Redemption'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmed */}
        {uiState === 'confirmed' && checkResult?.status === 'confirmed' && (
          <div className="space-y-4">
            <div className="bg-emerald-900 border border-emerald-600 rounded-xl p-8 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider mb-1">Redeemed!</p>
              <p className="text-white text-xl font-bold">{checkResult.promotion_title}</p>
              <p className="text-emerald-300 text-lg mt-1">{checkResult.discount}</p>
            </div>
            <button onClick={handleReset} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 text-lg rounded-xl">
              Next Customer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
