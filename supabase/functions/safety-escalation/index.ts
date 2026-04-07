import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async () => {
  const now = new Date();

  const { data: sessions, error } = await supabase
    .from('safety_sessions')
    .select('*')
    .neq('status', 'resolved');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!sessions || sessions.length === 0) return new Response('No active sessions', { status: 200 });

  for (const session of sessions) {
    const scheduledMs = new Date(session.scheduled_time).getTime();
    const nowMs = now.getTime();
    const stage2TriggerMs = scheduledMs + session.stage2_delay_min * 60_000;
    const contactTriggerMs = session.stage2_fired_at
      ? new Date(session.stage2_fired_at).getTime() + session.contact_delay_min * 60_000
      : null;

    // Advance to Stage 2
    if (session.stage === 1 && nowMs >= stage2TriggerMs) {
      await supabase
        .from('safety_sessions')
        .update({ stage: 2, stage2_fired_at: now.toISOString() })
        .eq('id', session.id);

      console.log(`[Escalation] Session ${session.id} advanced to Stage 2`);
      continue;
    }

    // At Stage 2: check if likely_safe reminders needed
    if (session.stage === 2 && session.status === 'likely_safe') {
      const lastReminder = session.last_reminder_sent_at
        ? new Date(session.last_reminder_sent_at).getTime()
        : 0;
      const reminderDue = nowMs >= lastReminder + session.reminder_interval_min * 60_000;

      if (reminderDue) {
        await supabase
          .from('safety_sessions')
          .update({ last_reminder_sent_at: now.toISOString() })
          .eq('id', session.id);
        console.log(`[Escalation] Reminder due for likely_safe session ${session.id}`);
      }
      continue;
    }

    // Advance to Stage 3 (contact emergency contact)
    if (session.stage === 2 && session.status === 'active' && contactTriggerMs && nowMs >= contactTriggerMs) {
      await supabase
        .from('safety_sessions')
        .update({ stage: 3 })
        .eq('id', session.id);

      // Call safety-notify-contact
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/safety-notify-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ sessionId: session.id }),
      });

      console.log(`[Escalation] Session ${session.id} advanced to Stage 3 — notifying emergency contact`);
    }
  }

  return new Response(JSON.stringify({ processed: sessions.length }), { status: 200 });
});
