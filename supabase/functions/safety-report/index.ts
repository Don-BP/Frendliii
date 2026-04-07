import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function emergencyNumber(acceptLanguage: string): string {
  const lang = acceptLanguage.toLowerCase();
  if (lang.includes('en-gb')) return '999';
  if (lang.includes('en-au')) return '000';
  if (lang.includes('de') || lang.includes('fr') || lang.includes('es') || lang.includes('it') || lang.includes('nl') || lang.includes('pl')) return '112';
  return '911';
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) return new Response('Missing token', { status: 400 });

  const { data: incident } = await supabase
    .from('safety_incidents')
    .select('*, safety_sessions(*)')
    .eq('report_token', token)
    .single();

  if (!incident) return new Response('Report not found', { status: 404 });

  const session = incident.safety_sessions;
  const status = incident.status;
  const statusLabel = status === 'resolved' ? 'RESOLVED' : status === 'likely_safe' ? 'LIKELY SAFE' : 'ACTIVE ALERT';
  const statusColor = status === 'resolved' ? '#22c55e' : status === 'likely_safe' ? '#f59e0b' : '#ef4444';
  const statusNote = status === 'resolved'
    ? 'The user has confirmed they are safe.'
    : status === 'likely_safe'
    ? "The user's phone has been detected at the venue. They may have forgotten to check in."
    : 'This alert is active. The user has not confirmed they are safe.';

  const mapLink = session.last_known_lat
    ? `https://www.google.com/maps?q=${session.last_known_lat},${session.last_known_lng}`
    : null;

  const emergencyNum = emergencyNumber(req.headers.get('accept-language') ?? '');

  const emailSubject = encodeURIComponent(`SafeArrival Alert — Incident Report`);
  const emailBody = encodeURIComponent(
    `SafeArrival Alert\n\nVenue: ${session.venue_name}\nAddress: ${session.venue_address}\nMeetup time: ${new Date(session.scheduled_time).toLocaleString()}\nMet with: ${session.other_person_first_name}\n${mapLink ? `Last known location: ${mapLink}` : ''}\n\nStatus: ${statusLabel}`
  );

  const reportText = `SafeArrival Alert\nVenue: ${session.venue_name}\nAddress: ${session.venue_address}\nMeetup time: ${new Date(session.scheduled_time).toLocaleString()}\nMet with: ${session.other_person_first_name}\n${mapLink ? `Last known location: ${mapLink}` : ''}\nStatus: ${statusLabel}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeArrival Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f0f0f; color: #f1f1f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 24px 16px; }
    .container { max-width: 480px; margin: 0 auto; }
    .status-banner { background: ${statusColor}22; border: 2px solid ${statusColor}; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .status-label { color: ${statusColor}; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .status-note { color: #ccc; font-size: 14px; margin-top: 6px; }
    .card { background: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
    .row { margin-bottom: 10px; }
    .row .label { font-size: 12px; color: #666; }
    .row .value { font-size: 16px; color: #f1f1f1; font-weight: 500; }
    a.map-link { color: #3b82f6; text-decoration: underline; }
    .actions { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
    .btn { display: block; width: 100%; padding: 18px; border-radius: 12px; text-align: center; font-size: 17px; font-weight: 600; text-decoration: none; border: none; cursor: pointer; }
    .btn-call { background: #ef4444; color: white; }
    .btn-email { background: #3b82f6; color: white; }
    .btn-copy { background: #374151; color: white; }
    .footer { text-align: center; color: #444; font-size: 12px; margin-top: 24px; }
    #copied { display: none; color: #22c55e; text-align: center; margin-top: 8px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-banner">
      <div class="status-label">${statusLabel}</div>
      <div class="status-note">${statusNote}</div>
    </div>

    <div class="card">
      <h2>Incident Details</h2>
      <div class="row"><div class="label">Venue</div><div class="value">${session.venue_name}</div></div>
      <div class="row"><div class="label">Address</div><div class="value">${session.venue_address}</div></div>
      <div class="row"><div class="label">Scheduled time</div><div class="value">${new Date(session.scheduled_time).toLocaleString()}</div></div>
      <div class="row"><div class="label">Met with</div><div class="value">${session.other_person_first_name}</div></div>
      ${mapLink ? `<div class="row"><div class="label">Last known location</div><div class="value"><a class="map-link" href="${mapLink}" target="_blank">Open in Maps</a></div></div>` : ''}
    </div>

    <div class="card">
      <h2>Take Action</h2>
      <div class="actions">
        <a class="btn btn-call" href="tel:${emergencyNum}">Call Emergency Services (${emergencyNum})</a>
        <a class="btn btn-email" href="mailto:?subject=${emailSubject}&body=${emailBody}">Email Report</a>
        <button class="btn btn-copy" onclick="copyReport()">Copy Report Text</button>
        <div id="copied">Copied to clipboard</div>
      </div>
    </div>

    <div class="footer">Generated by Frendli SafeArrival &middot; ${new Date(incident.created_at).toLocaleString()}</div>
  </div>
  <script>
    const reportText = ${JSON.stringify(reportText)};
    function copyReport() {
      navigator.clipboard.writeText(reportText).then(() => {
        document.getElementById('copied').style.display = 'block';
        setTimeout(() => { document.getElementById('copied').style.display = 'none'; }, 2000);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
