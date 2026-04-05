import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, format } from 'date-fns'
import { jsPDF } from 'jspdf'

export interface ReportSettings {
  venue_id: string
  email_enabled: boolean
  delivery_day: number
}

export interface ReportRecord {
  id: string
  report_month: string   // 'YYYY-MM-DD' (always 1st of month)
  generated_at: string
  pdf_url: string | null
}

export interface ReportsHook {
  loading: boolean
  settings: ReportSettings
  reports: ReportRecord[]
  canGenerate: boolean
  generateReport: (month?: Date) => Promise<void>
  updateSettings: (patch: Partial<Pick<ReportSettings, 'email_enabled' | 'delivery_day'>>) => Promise<void>
  getSignedUrl: (pdfUrl: string) => Promise<string>
}

const DEFAULT_SETTINGS: ReportSettings = {
  venue_id: '',
  email_enabled: true,
  delivery_day: 1,
}

export function useReports(venueId: string | undefined): ReportsHook {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ReportSettings>(DEFAULT_SETTINGS)
  const [reports, setReports] = useState<ReportRecord[]>([])

  const currentMonthIso = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const canGenerate = !reports.some(r => r.report_month === currentMonthIso)

  useEffect(() => {
    if (!venueId) { setLoading(false); return }

    const load = async () => {
      // Ensure settings row exists, then fetch it
      await supabase
        .from('venue_report_settings')
        .upsert({ venue_id: venueId, email_enabled: true, delivery_day: 1 }, { onConflict: 'venue_id', ignoreDuplicates: true })

      const { data: settingsData } = await supabase
        .from('venue_report_settings')
        .select()
        .eq('venue_id', venueId)
        .single()

      if (settingsData) setSettings(settingsData as ReportSettings)

      const { data: reportsData } = await supabase
        .from('venue_reports')
        .select('id, report_month, generated_at, pdf_url')
        .eq('venue_id', venueId)
        .order('report_month', { ascending: false })

      setReports((reportsData ?? []) as ReportRecord[])
      setLoading(false)
    }

    load()
  }, [venueId])

  const updateSettings = useCallback(async (
    patch: Partial<Pick<ReportSettings, 'email_enabled' | 'delivery_day'>>
  ) => {
    if (!venueId) return
    const updated = { ...settings, ...patch, venue_id: venueId }
    await supabase.from('venue_report_settings').upsert(updated, { onConflict: 'venue_id' })
    setSettings(updated)
  }, [venueId, settings])

  const generateReport = useCallback(async (month: Date = new Date()) => {
    if (!venueId) return
    const monthStart = startOfMonth(month)
    const monthLabel = format(monthStart, 'MMMM yyyy')
    const reportMonthIso = format(monthStart, 'yyyy-MM-dd')

    // Query redemption data for the month
    const { data: redemptions } = await supabase
      .from('venue_redemptions')
      .select('redeemed_at, user_id')
      .eq('venue_id', venueId)
      .gte('redeemed_at', monthStart.toISOString())
      .not('redeemed_at', 'is', null)

    const rows = redemptions ?? []

    // Build PDF with jsPDF
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(`Frendli — Foot Traffic Report`, 20, 20)
    doc.setFontSize(14)
    doc.text(monthLabel, 20, 30)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Total redemptions: ${rows.length}`, 20, 50)

    const uniqueUsers = new Set(rows.map((r: { user_id: string }) => r.user_id)).size
    doc.text(`Unique visitors: ${uniqueUsers}`, 20, 60)

    // Daily bar chart (visual rectangles)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const countByDay: Record<number, number> = {}
    days.forEach(d => countByDay[d] = 0)
    rows.forEach((r: { redeemed_at: string }) => {
      const day = new Date(r.redeemed_at).getDate()
      countByDay[day] = (countByDay[day] ?? 0) + 1
    })

    const chartTop = 80
    const chartHeight = 60
    const barWidth = 170 / days.length
    const maxCount = Math.max(...Object.values(countByDay), 1)
    doc.setFillColor(255, 127, 97)

    days.forEach((d, i) => {
      const count = countByDay[d] ?? 0
      const barH = (count / maxCount) * chartHeight
      doc.rect(20 + i * barWidth, chartTop + chartHeight - barH, barWidth - 1, barH, 'F')
    })

    doc.setFontSize(9)
    doc.text('1', 20, chartTop + chartHeight + 6)
    doc.text(`${days.length}`, 20 + (days.length - 1) * barWidth, chartTop + chartHeight + 6)
    doc.text('Daily redemptions', 20, chartTop + chartHeight + 14)

    // Upload to Supabase storage
    const pdfBlob = doc.output('blob')
    const storagePath = `${venueId}/${reportMonthIso}.pdf`
    await supabase.storage.from('venue-reports').upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

    // Insert/update record
    await supabase
      .from('venue_reports')
      .upsert({ venue_id: venueId, report_month: reportMonthIso, pdf_url: storagePath }, { onConflict: 'venue_id,report_month' })

    const newRecord: ReportRecord = {
      id: crypto.randomUUID(),
      report_month: reportMonthIso,
      generated_at: new Date().toISOString(),
      pdf_url: storagePath,
    }
    setReports(prev => [newRecord, ...prev.filter(r => r.report_month !== reportMonthIso)])

    // Trigger email if enabled
    if (settings.email_enabled) {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-monthly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ venueId, reportMonth: reportMonthIso, pdfUrl: storagePath }),
      })
    }
  }, [venueId, settings.email_enabled])

  const getSignedUrl = useCallback(async (pdfUrl: string): Promise<string> => {
    const { data } = await supabase.storage.from('venue-reports').createSignedUrl(pdfUrl, 3600)
    return data?.signedUrl ?? ''
  }, [])

  return { loading, settings, reports, canGenerate, generateReport, updateSettings, getSignedUrl }
}
