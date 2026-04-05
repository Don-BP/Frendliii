import { useState } from 'react'
import { Download, Mail, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useReports } from '../hooks/useReports'
import { TierGate } from '../components/TierGate'

export default function Reports() {
  const { session, venue } = useAuth()
  const venueId = session?.user?.id
  const { loading, settings, reports, canGenerate, generateReport, updateSettings, getSignedUrl } = useReports(venueId)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    setGenerating(true)
    try {
      await generateReport()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (pdfUrl: string, reportMonth: string) => {
    const signedUrl = await getSignedUrl(pdfUrl)
    const a = document.createElement('a')
    a.href = signedUrl
    a.download = `frendli-report-${reportMonth}.pdf`
    a.click()
  }

  if (!venue) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />
      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">
        Monthly Reports
      </h1>

      <TierGate venue={venue}>
        {loading ? (
          <p className="text-[#8E8271] dark:text-[#9E8FC0]">Loading…</p>
        ) : (
          <div className="space-y-6">
            {/* Settings panel */}
            <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">Delivery Settings</h2>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={e => updateSettings({ email_enabled: e.target.checked })}
                  className="w-4 h-4 accent-[#FF7F61]"
                />
                <span className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8] flex items-center gap-2">
                  <Mail size={14} />
                  Receive monthly report by email
                </span>
              </label>

              {settings.email_enabled && (
                <label className="flex items-center gap-3">
                  <Calendar size={14} className="text-[#8E8271] dark:text-[#9E8FC0]" />
                  <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Send on day</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={settings.delivery_day}
                    onChange={e => updateSettings({ delivery_day: Number(e.target.value) })}
                    className="w-16 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-lg px-2 py-1 text-sm text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:border-[#FF7F61]"
                  />
                  <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">of each month</span>
                </label>
              )}
            </div>

            {/* Generate button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
              >
                {generating ? 'Generating…' : `Generate ${format(new Date(), 'MMMM yyyy')} Report`}
              </button>
              {!canGenerate && (
                <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">
                  Report for this month already generated.
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Past reports list */}
            {reports.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider">
                  Past Reports
                </h2>
                {reports.map(report => (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">
                        {format(parseISO(report.report_month), 'MMMM yyyy')}
                      </p>
                      <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">
                        Generated {format(parseISO(report.generated_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {report.pdf_url && (
                      <button
                        onClick={() => handleDownload(report.pdf_url!, report.report_month)}
                        className="flex items-center gap-2 text-sm text-[#FF7F61] hover:text-[#E6684B] font-semibold transition-colors"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {reports.length === 0 && (
              <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">
                No reports yet. Generate your first one above.
              </p>
            )}
          </div>
        )}
      </TierGate>
    </div>
  )
}
