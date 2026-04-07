# SafeArrival Stage 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing SafeArrival escalation system with server-side safety net, geofence-aware `likely_safe` status, user-configurable timing, permanent incident records, a tabbed Safety Settings screen, and an emergency contact landing page with police-share opt-in.

**Architecture:** Hybrid client + server — client schedules local push notifications for immediate UX; when a hangout activates, the app also registers a `safety_session` in Supabase so a pg_cron-driven edge function can escalate independently if the phone dies. Geofence check-ins flip the session to `likely_safe` to suppress emergency contact alerts when the phone is at the venue.

**Tech Stack:** React Native / Expo (frendli-app), Express 5 + Supabase JS client (frendli-api), Supabase edge functions (Deno), Resend (email), pg_cron, expo-notifications, expo-location / TaskManager.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260407000001_safety_sessions.sql` | Tables: `user_safety_settings`, `safety_sessions`, `safety_incidents` + RLS |
| Modify | `frendli-api/src/routes/safety.ts` | Add `POST /session/start`, `POST /session/resolve`, `GET /incidents`; extend `POST /check-in` with geofence + likely_safe flip |
| Create | `frendli-api/src/routes/__tests__/safety-sessions.test.ts` | Jest + Supertest tests for the 3 new routes |
| Create | `supabase/functions/safety-escalation/index.ts` | pg_cron handler — checks sessions every 5 min, advances stages |
| Create | `supabase/functions/safety-notify-contact/index.ts` | Creates incident record, sends Resend email to emergency contact |
| Create | `supabase/functions/safety-report/index.ts` | Public HTML landing page for emergency contacts (call / email / copy) |
| Modify | `frendli-app/lib/safety-location.ts` | Call session/start & session/resolve, schedule likely_safe reminders |
| Create | `frendli-app/app/safety-settings.tsx` | Tabbed Safety Settings screen (Settings + History tabs) |
| Modify | `frendli-app/app/(tabs)/profile.tsx` | Add "Safety Settings" nav entry |

---

## Task 1: Supabase Migration — Safety Tables

**Files:**
- Create: `supabase/migrations/20260407000001_safety_sessions.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260407000001_safety_sessions.sql

-- User safety preferences (one row per user)
CREATE TABLE user_safety_settings (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_contact_email text,
  stage2_delay_min    int NOT NULL DEFAULT 10,
  contact_delay_min   int NOT NULL DEFAULT 30,
  reminder_interval_min int NOT NULL DEFAULT 30,
  stage4_enabled      boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_safety_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all" ON user_safety_settings
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Active SafeArrival sessions (one per hangout activation)
CREATE TABLE safety_sessions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hangout_id              text NOT NULL,
  venue_lat               float NOT NULL,
  venue_lng               float NOT NULL,
  venue_name              text NOT NULL,
  venue_address           text NOT NULL,
  other_person_first_name text NOT NULL,
  scheduled_time          timestamptz NOT NULL,
  stage                   int NOT NULL DEFAULT 1,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'likely_safe', 'resolved')),
  stage2_delay_min        int NOT NULL DEFAULT 10,
  contact_delay_min       int NOT NULL DEFAULT 30,
  reminder_interval_min   int NOT NULL DEFAULT 30,
  stage4_enabled          boolean NOT NULL DEFAULT false,
  last_known_lat          float,
  last_known_lng          float,
  stage2_fired_at         timestamptz,
  last_reminder_sent_at   timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  resolved_at             timestamptz
);

ALTER TABLE safety_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all" ON safety_sessions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "service role all" ON safety_sessions
  USING (true) WITH CHECK (true);

-- Incident records (created when Stage 3 fires)
CREATE TABLE safety_incidents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_session_id       uuid NOT NULL REFERENCES safety_sessions(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_name  text NOT NULL,
  emergency_contact_phone text NOT NULL,
  emergency_contact_email text NOT NULL,
  report_token            uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'likely_safe', 'resolved')),
  police_link_accessed    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  resolved_at             timestamptz
);

ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON safety_incidents
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "service role all" ON safety_incidents
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply the migration**

```bash
cd e:/Frendli
npx supabase db push
```

Expected output: `Finished supabase db push.` with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407000001_safety_sessions.sql
git commit -m "feat(supabase): add safety_sessions, safety_incidents, user_safety_settings tables"
```

---

## Task 2: API — Install Supabase Client + New Safety Session Routes

**Files:**
- Modify: `frendli-api/src/routes/safety.ts`
- Create: `frendli-api/src/routes/__tests__/safety-sessions.test.ts`

The new routes access the Supabase tables (not Prisma) because the edge functions also need to read/write them. Add `@supabase/supabase-js` to the API if not installed.

- [ ] **Step 1: Check if @supabase/supabase-js is installed in frendli-api**

```bash
cd e:/Frendli/frendli-api
cat package.json | grep supabase
```

If not present, install it:

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Write the failing tests**

Create `frendli-api/src/routes/__tests__/safety-sessions.test.ts`:

```typescript
import request from 'supertest';
import express from 'express';

// --- Mocks ---
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockLimit = jest.fn();

const mockChain = {
  select: mockSelect,
  eq: mockEq,
  insert: mockInsert,
  update: mockUpdate,
  order: mockOrder,
  single: mockSingle,
  limit: mockLimit,
};

Object.values(mockChain).forEach(fn => (fn as jest.Mock).mockReturnValue(mockChain));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));
mockFrom.mockReturnValue(mockChain);

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    profile: { update: jest.fn().mockResolvedValue({}) },
    hangoutAttendee: {
      updateMany: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    hangout: { findUnique: jest.fn().mockResolvedValue(null) },
  })),
}));

jest.mock('../../services/notification.service', () => ({
  NotificationService: { sendToUser: jest.fn() },
}));

import safetyRouter from '../safety';

function buildApp(userId = 'user-001') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: userId };
    next();
  });
  app.use('/', safetyRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('POST /session/start', () => {
  it('inserts a safety_session and returns 201', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage2_delay_min: 10, contact_delay_min: 30, reminder_interval_min: 30, stage4_enabled: false }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { id: 'sess-1' }, error: null });

    const res = await request(buildApp()).post('/session/start').send({
      hangoutId: 'hang-1',
      venueLat: 51.5,
      venueLng: -0.1,
      venueName: 'The Crown',
      venueAddress: '1 High St',
      otherPersonFirstName: 'Alex',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
  });

  it('returns 400 if required fields are missing', async () => {
    const res = await request(buildApp()).post('/session/start').send({ hangoutId: 'hang-1' });
    expect(res.status).toBe(400);
  });
});

describe('POST /session/resolve', () => {
  it('marks session and incident resolved and returns 200', async () => {
    mockEq.mockResolvedValueOnce({ error: null }); // update safety_sessions
    mockEq.mockResolvedValueOnce({ error: null }); // update safety_incidents

    const res = await request(buildApp()).post('/session/resolve').send({ hangoutId: 'hang-1' });
    expect(res.status).toBe(200);
  });
});

describe('GET /incidents', () => {
  it('returns incident list for the user', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: 'inc-1', status: 'resolved', created_at: new Date().toISOString() }],
      error: null,
    });

    const res = await request(buildApp()).get('/incidents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd e:/Frendli/frendli-api
npx jest src/routes/__tests__/safety-sessions.test.ts --no-coverage
```

Expected: FAIL — routes not implemented yet.

- [ ] **Step 4: Add Supabase client helper to safety.ts and implement the 3 new routes**

At the top of `frendli-api/src/routes/safety.ts`, after the existing imports, add:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

Then add these routes before `export default router;`:

```typescript
// Start a SafeArrival session (called when hangout activates)
router.post('/session/start', async (req, res) => {
  const userId = (req.user as any).id;
  const { hangoutId, venueLat, venueLng, venueName, venueAddress, otherPersonFirstName, scheduledTime } = req.body;

  if (!hangoutId || !venueLat || !venueLng || !venueName || !venueAddress || !otherPersonFirstName || !scheduledTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Fetch user settings (or use defaults)
  const { data: settings } = await supabaseAdmin
    .from('user_safety_settings')
    .select('stage2_delay_min, contact_delay_min, reminder_interval_min, stage4_enabled')
    .eq('user_id', userId)
    .single();

  const { data: session, error } = await supabaseAdmin
    .from('safety_sessions')
    .insert({
      user_id: userId,
      hangout_id: hangoutId,
      venue_lat: venueLat,
      venue_lng: venueLng,
      venue_name: venueName,
      venue_address: venueAddress,
      other_person_first_name: otherPersonFirstName,
      scheduled_time: scheduledTime,
      stage2_delay_min: settings?.stage2_delay_min ?? 10,
      contact_delay_min: settings?.contact_delay_min ?? 30,
      reminder_interval_min: settings?.reminder_interval_min ?? 30,
      stage4_enabled: settings?.stage4_enabled ?? false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating safety session:', error);
    return res.status(500).json({ error: 'Failed to start safety session' });
  }

  res.status(201).json({ sessionId: session.id });
});

// Resolve a SafeArrival session (called when user taps "I'm Safe")
router.post('/session/resolve', async (req, res) => {
  const userId = (req.user as any).id;
  const { hangoutId } = req.body;

  const now = new Date().toISOString();

  await supabaseAdmin
    .from('safety_sessions')
    .update({ status: 'resolved', resolved_at: now })
    .eq('user_id', userId)
    .eq('hangout_id', hangoutId);

  // Resolve any linked incident
  const { data: sessions } = await supabaseAdmin
    .from('safety_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('hangout_id', hangoutId);

  if (sessions && sessions.length > 0) {
    await supabaseAdmin
      .from('safety_incidents')
      .update({ status: 'resolved', resolved_at: now })
      .eq('safety_session_id', sessions[0].id);
  }

  res.status(200).json({ message: 'Session resolved' });
});

// Get incident history for the current user
router.get('/incidents', async (req, res) => {
  const userId = (req.user as any).id;

  const { data, error } = await supabaseAdmin
    .from('safety_incidents')
    .select('id, status, created_at, resolved_at, emergency_contact_name, report_token, safety_session_id, safety_sessions(venue_name, venue_address, other_person_first_name, scheduled_time)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch incidents' });
  }

  res.status(200).json(data);
});
```

- [ ] **Step 5: Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to frendli-api .env**

Open `frendli-api/.env` and add (use the values from your Supabase project settings → API):

```
SUPABASE_URL=https://vodhhpgtxftxqdokghhc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd e:/Frendli/frendli-api
npx jest src/routes/__tests__/safety-sessions.test.ts --no-coverage
```

Expected: PASS — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add frendli-api/src/routes/safety.ts frendli-api/src/routes/__tests__/safety-sessions.test.ts
git commit -m "feat(api): add safety session/start, session/resolve, incidents routes"
```

---

## Task 3: Extend check-in Route with Geofence + likely_safe

**Files:**
- Modify: `frendli-api/src/routes/safety.ts` (the existing `POST /check-in` handler)

The existing check-in updates `profile.latitude/longitude`. Extend it to also update `safety_sessions.last_known_lat/lng` and flip status to `likely_safe` when within 200m of the venue.

- [ ] **Step 1: Add the `distanceMetres` helper at the top of safety.ts** (after imports):

```typescript
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOFENCE_RADIUS_M = 200;
```

- [ ] **Step 2: Add the geofence block at the end of the existing `POST /check-in` handler**, just before `res.status(200).json(...)`:

```typescript
// Update active safety session with latest location + geofence check
if (location?.latitude && location?.longitude) {
  const { data: activeSessions } = await supabaseAdmin
    .from('safety_sessions')
    .select('id, venue_lat, venue_lng, status, reminder_interval_min, last_reminder_sent_at')
    .eq('user_id', userId)
    .neq('status', 'resolved')
    .limit(1);

  if (activeSessions && activeSessions.length > 0) {
    const session = activeSessions[0];
    const dist = distanceMetres(location.latitude, location.longitude, session.venue_lat, session.venue_lng);
    const atVenue = dist <= GEOFENCE_RADIUS_M;
    const newStatus = atVenue ? 'likely_safe' : session.status === 'likely_safe' ? 'active' : session.status;

    await supabaseAdmin
      .from('safety_sessions')
      .update({
        last_known_lat: location.latitude,
        last_known_lng: location.longitude,
        status: newStatus,
      })
      .eq('id', session.id);

    // Also sync incident status if one exists
    if (newStatus !== session.status) {
      await supabaseAdmin
        .from('safety_incidents')
        .update({ status: newStatus })
        .eq('safety_session_id', session.id)
        .neq('status', 'resolved');
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frendli-api/src/routes/safety.ts
git commit -m "feat(api): extend check-in with geofence likely_safe detection"
```

---

## Task 4: safety-escalation Edge Function

**Files:**
- Create: `supabase/functions/safety-escalation/index.ts`

Called by pg_cron every 5 minutes. Checks all non-resolved sessions and advances stages based on elapsed time and geofence status.

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/safety-escalation/index.ts
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

      // Push notification would be sent via a separate FCM call here.
      // For now, log the escalation event.
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
        // Client-side handles push; this marks the server record
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
```

- [ ] **Step 2: Deploy the function**

```bash
cd e:/Frendli
npx supabase functions deploy safety-escalation
```

Expected: `Deployed Functions on project vodhhpgtxftxqdokghhc: safety-escalation`

- [ ] **Step 3: Register the pg_cron job** in Supabase SQL Editor:

```sql
select cron.schedule(
  'safety-escalation-check',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://vodhhpgtxftxqdokghhc.supabase.co/functions/v1/safety-escalation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/safety-escalation/index.ts
git commit -m "feat(supabase): add safety-escalation edge function + pg_cron job"
```

---

## Task 5: safety-notify-contact Edge Function

**Files:**
- Create: `supabase/functions/safety-notify-contact/index.ts`

Creates the `safety_incidents` record and sends email to the emergency contact via Resend.

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/safety-notify-contact/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  const { sessionId } = await req.json();

  // Load session + user safety settings
  const { data: session } = await supabase
    .from('safety_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return new Response('Session not found', { status: 404 });

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
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy safety-notify-contact
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/safety-notify-contact/index.ts
git commit -m "feat(supabase): add safety-notify-contact edge function"
```

---

## Task 6: safety-report Edge Function (Landing Page)

**Files:**
- Create: `supabase/functions/safety-report/index.ts`

Public HTML page — no auth required. Looks up incident by `report_token`, renders status + actions.

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/safety-report/index.ts
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
  return '911'; // default: North America
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
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy safety-report
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/safety-report/index.ts
git commit -m "feat(supabase): add safety-report public landing page edge function"
```

---

## Task 7: Update safety-location.ts — Session Lifecycle + Likely-Safe Reminders

**Files:**
- Modify: `frendli-app/lib/safety-location.ts`

- [ ] **Step 1: Add `sessionStart` and `sessionResolve` API calls**

Add these two helpers after the existing `cancelSafeArrivalNotifications` function:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getAuthHeaders(): Promise<HeadersInit | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export async function startSafetySession(config: SafeArrivalConfig): Promise<void> {
  const headers = await getAuthHeaders();
  if (!headers) return;
  try {
    await fetch(`${API_URL}/api/safety/session/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        hangoutId: config.hangoutId,
        venueLat: config.venueLat,
        venueLng: config.venueLng,
        venueName: config.venueName,
        venueAddress: config.venueAddress,
        otherPersonFirstName: config.otherPersonFirstName,
        scheduledTime: config.scheduledTime,
      }),
    });
  } catch (err) {
    console.error('Failed to start safety session:', err);
  }
}

export async function resolveSafetySession(hangoutId: string): Promise<void> {
  const headers = await getAuthHeaders();
  if (!headers) return;
  try {
    await fetch(`${API_URL}/api/safety/session/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ hangoutId }),
    });
  } catch (err) {
    console.error('Failed to resolve safety session:', err);
  }
}
```

- [ ] **Step 2: Update `setSafeArrivalConfig` to start the server-side session**

Replace the existing `setSafeArrivalConfig`:

```typescript
export function setSafeArrivalConfig(config: SafeArrivalConfig | null) {
  safeArrivalConfig = config;
  userConfirmedSafe = false;
  escalationStage = 0;
  if (config) {
    startSafetySession(config); // fire-and-forget server registration
  }
}
```

- [ ] **Step 3: Update `confirmUserSafe` to resolve the server session**

Replace the existing `confirmUserSafe`:

```typescript
export function confirmUserSafe() {
  userConfirmedSafe = true;
  if (safeArrivalConfig) {
    resolveSafetySession(safeArrivalConfig.hangoutId); // fire-and-forget
  }
}
```

- [ ] **Step 4: Add likely_safe reminder notification scheduling**

Add this helper after `resolveSafetySession`:

```typescript
export async function scheduleLikelySafeReminder(hangoutId: string, intervalMin: number): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Cancel any existing likely_safe reminders first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as any)?.type === 'likely_safe_reminder' && (n.content.data as any)?.hangoutId === hangoutId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Looks like you made it!",
      body: "Tap to confirm you're safe and stop the alerts.",
      data: { type: 'likely_safe_reminder', hangoutId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalMin * 60,
      repeats: true,
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add frendli-app/lib/safety-location.ts
git commit -m "feat(app): extend safety-location with server session lifecycle + likely_safe reminders"
```

---

## Task 8: Safety Settings Screen

**Files:**
- Create: `frendli-app/app/safety-settings.tsx`

- [ ] **Step 1: Create the screen**

```typescript
// frendli-app/app/safety-settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Switch, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Tab = 'settings' | 'history';

type SafetySettings = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
  stage2_delay_min: number;
  contact_delay_min: number;
  reminder_interval_min: number;
  stage4_enabled: boolean;
};

type Incident = {
  id: string;
  status: 'active' | 'likely_safe' | 'resolved';
  created_at: string;
  safety_sessions: {
    venue_name: string;
    venue_address: string;
    other_person_first_name: string;
    scheduled_time: string;
  };
};

const STAGE2_OPTIONS = [5, 10, 15, 20];
const CONTACT_DELAY_OPTIONS = [15, 30, 60, 120];
const REMINDER_OPTIONS = [15, 30, 60];

export default function SafetySettingsScreen() {
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SafetySettings>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    stage2_delay_min: 10,
    contact_delay_min: 30,
    reminder_interval_min: 30,
    stage4_enabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  async function loadSettings() {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;
    const { data } = await supabase!
      .from('user_safety_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) setSettings(data);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;
    const { error } = await supabase!
      .from('user_safety_settings')
      .upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) Alert.alert('Error', 'Failed to save settings');
    else Alert.alert('Saved', 'Safety settings updated');
  }

  async function loadHistory() {
    setLoadingHistory(true);
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/safety/incidents`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    const data = await res.json();
    setIncidents(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  }

  const statusColor = (s: string) =>
    s === 'resolved' ? '#22c55e' : s === 'likely_safe' ? '#f59e0b' : '#ef4444';
  const statusLabel = (s: string) =>
    s === 'resolved' ? 'Resolved' : s === 'likely_safe' ? 'Likely Safe' : 'Active';

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['settings', 'history'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'settings' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.section}>Emergency Contact</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666"
            value={settings.emergency_contact_name}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_name: v }))} />
          <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={settings.emergency_contact_phone}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_phone: v }))} />
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#666"
            keyboardType="email-address" autoCapitalize="none"
            value={settings.emergency_contact_email}
            onChangeText={v => setSettings(s => ({ ...s, emergency_contact_email: v }))} />

          <Text style={styles.section}>Escalation Timing</Text>

          <Text style={styles.label}>Follow-up delay (after missed Stage 1)</Text>
          <View style={styles.optionRow}>
            {STAGE2_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.stage2_delay_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, stage2_delay_min: n }))}>
                <Text style={[styles.optionText, settings.stage2_delay_min === n && styles.optionTextActive]}>{n}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Emergency contact delay (after missed follow-up, phone not at venue)</Text>
          <View style={styles.optionRow}>
            {CONTACT_DELAY_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.contact_delay_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, contact_delay_min: n }))}>
                <Text style={[styles.optionText, settings.contact_delay_min === n && styles.optionTextActive]}>
                  {n >= 60 ? `${n / 60}h` : `${n}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Safe-but-forgot reminder interval</Text>
          <View style={styles.optionRow}>
            {REMINDER_OPTIONS.map(n => (
              <TouchableOpacity key={n} style={[styles.option, settings.reminder_interval_min === n && styles.optionActive]}
                onPress={() => setSettings(s => ({ ...s, reminder_interval_min: n }))}>
                <Text style={[styles.optionText, settings.reminder_interval_min === n && styles.optionTextActive]}>{n}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.section}>Advanced</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Include police-share link</Text>
              <Text style={styles.toggleSub}>Adds a one-tap link in the emergency contact alert to share incident details with local police. Optional.</Text>
            </View>
            <Switch
              value={settings.stage4_enabled}
              onValueChange={v => setSettings(s => ({ ...s, stage4_enabled: v }))}
              trackColor={{ true: '#FF5C39' }}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {loadingHistory ? (
            <ActivityIndicator color="#FF5C39" style={{ marginTop: 40 }} />
          ) : incidents.length === 0 ? (
            <Text style={styles.empty}>No incidents on record.</Text>
          ) : (
            incidents.map(inc => (
              <TouchableOpacity key={inc.id} style={styles.incidentCard}
                onPress={() => setExpandedId(expandedId === inc.id ? null : inc.id)}>
                <View style={styles.incidentHeader}>
                  <Text style={styles.incidentVenue}>{inc.safety_sessions?.venue_name ?? '—'}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(inc.status) + '22', borderColor: statusColor(inc.status) }]}>
                    <Text style={[styles.badgeText, { color: statusColor(inc.status) }]}>{statusLabel(inc.status)}</Text>
                  </View>
                </View>
                <Text style={styles.incidentDate}>{new Date(inc.created_at).toLocaleDateString()}</Text>
                {expandedId === inc.id && inc.safety_sessions && (
                  <View style={styles.incidentDetail}>
                    <Text style={styles.detailText}>Address: {inc.safety_sessions.venue_address}</Text>
                    <Text style={styles.detailText}>Meetup time: {new Date(inc.safety_sessions.scheduled_time).toLocaleString()}</Text>
                    <Text style={styles.detailText}>Met with: {inc.safety_sessions.other_person_first_name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FF5C39' },
  tabText: { color: '#666', fontSize: 15, fontWeight: '500' },
  tabTextActive: { color: '#FF5C39' },
  content: { padding: 20, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, color: '#f1f1f1', fontSize: 16, marginBottom: 10 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  option: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  optionActive: { borderColor: '#FF5C39', backgroundColor: '#FF5C3922' },
  optionText: { color: '#888', fontSize: 14, fontWeight: '500' },
  optionTextActive: { color: '#FF5C39' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, marginTop: 8 },
  toggleText: { flex: 1, marginRight: 12 },
  toggleLabel: { color: '#f1f1f1', fontSize: 15, fontWeight: '500' },
  toggleSub: { color: '#666', fontSize: 12, marginTop: 4 },
  saveBtn: { backgroundColor: '#FF5C39', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
  incidentCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 10 },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  incidentVenue: { color: '#f1f1f1', fontSize: 16, fontWeight: '600', flex: 1 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  incidentDate: { color: '#666', fontSize: 13, marginTop: 4 },
  incidentDetail: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingTop: 10, gap: 4 },
  detailText: { color: '#aaa', fontSize: 13 },
});
```

- [ ] **Step 2: Commit**

```bash
git add frendli-app/app/safety-settings.tsx
git commit -m "feat(app): add Safety Settings screen with Settings + History tabs"
```

---

## Task 9: Profile Nav Entry + pg_cron Service Role Fix

**Files:**
- Modify: `frendli-app/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add Safety Settings nav entry to profile screen**

Find the settings/nav section in `frendli-app/app/(tabs)/profile.tsx` and add a Safety Settings row. The exact insertion point depends on the current list structure — look for other nav rows (e.g. "Edit Profile", "Notifications") and add after them:

```typescript
// Add this import at the top if not already present
import { useRouter } from 'expo-router';

// Inside the component, add:
const router = useRouter();

// Add this TouchableOpacity in the nav list:
<TouchableOpacity
  style={styles.navRow}  // use whatever style the other rows use
  onPress={() => router.push('/safety-settings')}
>
  <Text style={styles.navRowText}>Safety Settings</Text>
</TouchableOpacity>
```

- [ ] **Step 2: Fix the pg_cron service role key reference**

The pg_cron SQL in Task 4 Step 3 used `current_setting('app.settings.service_role_key', true)` which may not be set. Run this in Supabase SQL Editor to set it:

```sql
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'your_service_role_key_here';
```

Replace `your_service_role_key_here` with the actual service role key from Supabase Dashboard → Settings → API.

Alternatively, hardcode the key directly in the cron SQL (less ideal but works):

```sql
-- Update the existing cron job
select cron.unschedule('safety-escalation-check');
select cron.schedule(
  'safety-escalation-check',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := 'https://vodhhpgtxftxqdokghhc.supabase.co/functions/v1/safety-escalation',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
```

- [ ] **Step 3: Commit**

```bash
git add frendli-app/app/(tabs)/profile.tsx
git commit -m "feat(app): add Safety Settings nav entry to profile tab"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| `user_safety_settings` table | Task 1 |
| `safety_sessions` table | Task 1 |
| `safety_incidents` table | Task 1 |
| `POST /api/safety/session/start` | Task 2 |
| `POST /api/safety/session/resolve` | Task 2 |
| `GET /api/safety/incidents` | Task 2 |
| Extend check-in with geofence + likely_safe | Task 3 |
| `safety-escalation` edge function + pg_cron | Task 4 |
| `safety-notify-contact` edge function | Task 5 |
| `safety-report` public landing page | Task 6 |
| Call / email / copy actions on landing page | Task 6 |
| Country-detected emergency number | Task 6 |
| `safety-location.ts` session lifecycle hooks | Task 7 |
| Likely-safe reminder notifications | Task 7 |
| Tabbed Safety Settings screen | Task 8 |
| Emergency contact fields | Task 8 |
| Stage 2 delay picker | Task 8 |
| Contact delay picker | Task 8 |
| Reminder interval picker | Task 8 |
| Stage 4 toggle | Task 8 |
| History tab with incident list + expand | Task 8 |
| Profile nav entry | Task 9 |
| pg_cron service role key fix | Task 9 |
