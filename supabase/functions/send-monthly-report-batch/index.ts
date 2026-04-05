import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const today = new Date()
  const todayDay = today.getDate()
  // Report covers previous calendar month
  const reportMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString().slice(0, 10)

  // Find venues whose delivery_day matches today and email is enabled
  const { data: settings, error } = await supabase
    .from('venue_report_settings')
    .select('venue_id')
    .eq('email_enabled', true)
    .eq('delivery_day', todayDay)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results: { venueId: string; ok: boolean }[] = []

  for (const s of settings ?? []) {
    // Check if report already generated for last month
    const { data: existing } = await supabase
      .from('venue_reports')
      .select('id, pdf_url')
      .eq('venue_id', s.venue_id)
      .eq('report_month', reportMonth)
      .single()

    const pdfUrl = existing?.pdf_url ?? null

    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-monthly-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ venueId: s.venue_id, reportMonth, pdfUrl }),
      }
    )
    results.push({ venueId: s.venue_id, ok: res.ok })
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 })
})
