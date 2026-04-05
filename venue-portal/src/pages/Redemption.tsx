import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { staffFetch, StaffSessionExpiredError } from '../lib/staffAuth'
import { QrScanner } from '../components/QrScanner'

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
  const [scanMode, setScanMode] = useState(false)

  const handleCodeChange = (raw: string) => {
    const cleaned = raw.toUpperCase().split('').filter(c => VALID_CHARS.has(c)).slice(0, 6).join('')
    setCode(cleaned)
  }

  const handleCheckCode = async (overrideCode?: string) => {
    const codeToCheck = overrideCode ?? code
    if (codeToCheck.length !== 6) return
    setLoading(true)
    try {
      const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, { code: codeToCheck, action: 'check' }) as RedeemStatus
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

  const VALID_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

  const handleScanSuccess = (raw: string) => {
    const scanned = raw.trim().toUpperCase()
    if (!VALID_CODE_RE.test(scanned)) return
    setCode(scanned)
    setScanMode(false)
    handleCheckCode(scanned)
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

  const handleReset = () => { setCode(''); setCheckResult(null); setUiState('input') }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <div className="w-full max-w-sm">
        <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-8 rounded-full" />
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] text-center mb-8">
          Redeem Coupon
        </h1>

        {/* Code Input */}
        {uiState === 'input' && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex rounded-xl border border-[#EEEAE3] dark:border-[#3D2E55] overflow-hidden">
              <button
                onClick={() => setScanMode(false)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  !scanMode
                    ? 'bg-[#FF7F61] text-white'
                    : 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0]'
                }`}
              >
                Enter Code
              </button>
              <button
                onClick={() => setScanMode(true)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  scanMode
                    ? 'bg-[#FF7F61] text-white'
                    : 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0]'
                }`}
              >
                Scan QR Code
              </button>
            </div>

            {/* Manual entry */}
            {!scanMode && (
              <>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-white dark:bg-[#251A38] border-2 border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl px-4 py-4 text-[#2D1E4B] dark:text-[#F0EBF8] text-3xl text-center tracking-widest font-mono uppercase focus:outline-none focus:border-[#FF7F61]"
                />
                <button
                  onClick={() => handleCheckCode()}
                  disabled={code.length !== 6 || loading}
                  className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-bold py-4 text-lg rounded-2xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
                >
                  {loading ? 'Checking…' : 'Check Code'}
                </button>
              </>
            )}

            {/* QR scan */}
            {scanMode && (
              <div className="space-y-3">
                <QrScanner onSuccess={handleScanSuccess} />
                <p className="text-xs text-center text-[#8E8271] dark:text-[#9E8FC0]">
                  Point the camera at the customer's QR code
                </p>
              </div>
            )}
          </div>
        )}

        {/* Check result */}
        {uiState === 'check_result' && checkResult && (
          <div className="space-y-4">
            {checkResult.status === 'valid' && (
              <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-6 text-center">
                <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-1">Valid Code</p>
                <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
                <p className="text-[#FF7F61] text-lg mt-1">{checkResult.discount}</p>
                <p className="text-[#8E8271] dark:text-[#9E8FC0] text-xs mt-2">
                  Expires {format(new Date(checkResult.valid_until), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {checkResult.status === 'already_redeemed' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">Already Redeemed</p>
                <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
                <p className="text-red-400 text-sm mt-2">
                  Redeemed at {format(new Date(checkResult.redeemed_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
            {(checkResult.status === 'invalid' || checkResult.status === 'expired') && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">
                  {checkResult.status === 'expired' ? 'Expired Code' : 'Invalid Code'}
                </p>
                <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm mt-2">
                  {checkResult.status === 'expired' ? 'This promotion has expired.' : 'This code is not valid for your venue.'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 border border-[#EEEAE3] dark:border-[#3D2E55] text-[#2D1E4B] dark:text-[#C4B5E8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] font-semibold py-3 rounded-2xl transition-colors">
                Try Another
              </button>
              {checkResult.status === 'valid' && (
                <button onClick={handleConfirm} disabled={loading}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-colors">
                  {loading ? 'Confirming…' : 'Confirm Redemption'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmed */}
        {uiState === 'confirmed' && checkResult?.status === 'confirmed' && (
          <div className="space-y-4">
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-1">Redeemed!</p>
              <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
              <p className="text-[#FF7F61] text-lg mt-1">{checkResult.discount}</p>
            </div>
            <button onClick={handleReset}
              className="w-full bg-[#FF7F61] hover:bg-[#E6684B] text-white font-bold py-4 text-lg rounded-2xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
              Next Customer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
