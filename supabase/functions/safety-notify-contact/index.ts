import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  const { sessionId } = await req.json();

  // Load session
  const { data: session } = await supabase
    .from('safety_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return new Response('Session not found', { status: 404 });

  // Load user safety settings
  const { data: settings } = await supabase
    .from('user_safety_settings')
    .select('*')
    .eq('user_id', session.user_id)
    .single();

  if (!settings?.emergency_contact_email) {
    return new Response('No emergency contact configured', { status: 400 });
  }

  // Load user profile for first name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('user_id', session.user_id)
    .single();

  const userName = profile?.first_name ?? 'Your contact';
  const reportBaseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/safety-report`;

  // Create incident record
  const { data: incident } = await supabase
    .from('safety_incidents')
    .insert({
      safety_session_id: session.id,
      user_id: session.user_id,
      emergency_contact_name: settings.emergency_contact_name,
      emergency_contact_phone: settings.emergency_contact_phone,
      emergency_contact_email: settings.emergency_contact_email,
    })
    .select('report_token')
    .single();

  const reportUrl = `${reportBaseUrl}?token=${incident.report_token}`;

  const mapLink = session.last_known_lat
    ? `https://www.google.com/maps?q=${session.last_known_lat},${session.last_known_lng}`
    : null;

  const stage4Note = session.stage4_enabled
    ? `\n\nThis report includes a secure link to share all details with your local police authority. You can find that option on the report page.`
    : '';

  const emailBody = `
Hi ${settings.emergency_contact_name},

${userName} had a ${new Date(session.scheduled_time).toLocaleString()} meetup at ${session.venue_name} (${session.venue_address}) with someone named ${session.other_person_first_name} and hasn't confirmed they're okay.

${mapLink ? `Last known location: ${mapLink}` : ''}

View the full incident report and take action here:
${reportUrl}
${stage4Note}

— Frendli SafeArrival
  `.trim();

  // Send email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL'),
      to: settings.emergency_contact_email,
      subject: `SafeArrival Alert — ${userName}`,
      text: emailBody,
    }),
  });

  console.log(`[Notify] Incident created for session ${sessionId}, email sent to ${settings.emergency_contact_email}`);
  return new Response(JSON.stringify({ reportUrl }), { status: 200 });
});
