import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { venueId, reportMonth, pdfUrl } = await req.json() as {
    venueId: string
    reportMonth: string
    pdfUrl: string
  }

  // Fetch venue contact email
  const { data: venue, error } = await supabase
    .from('venues')
    .select('name, email')
    .eq('id', venueId)
    .single()

  if (error || !venue) {
    return new Response(JSON.stringify({ error: 'Venue not found' }), { status: 404 })
  }

  // Generate signed URL for the PDF (1 hour expiry)
  const { data: signed } = await supabase.storage
    .from('venue-reports')
    .createSignedUrl(pdfUrl, 3600)

  const downloadUrl = signed?.signedUrl ?? ''

  // Send email via Resend
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), { status: 500 })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Frendli Reports <reports@frendli.app>',
      to: [venue.email],
      subject: `Your Frendli Monthly Report — ${reportMonth}`,
      html: `
        <h2>Hi ${venue.name},</h2>
        <p>Your monthly foot traffic report for <strong>${reportMonth}</strong> is ready.</p>
        <p><a href="${downloadUrl}">Download your report (PDF)</a></p>
        <p>This link expires in 1 hour. Log in to the Frendli Venue Portal to download it again anytime.</p>
        <p>— The Frendli Team</p>
      `,
    }),
  })

  if (!emailRes.ok) {
    return new Response(JSON.stringify({ error: 'Email send failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
