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
