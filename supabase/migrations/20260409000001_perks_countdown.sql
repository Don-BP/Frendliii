-- supabase/migrations/20260409000001_perks_countdown.sql

-- 1. Notification preferences (standalone — profile data lives in Prisma-managed "Profile" table)
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id                       uuid     PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token                    text,
  latitude                      float8,
  longitude                     float8,
  notify_expiring_perks         boolean  NOT NULL DEFAULT true,
  notify_expiring_perks_hours   integer  NOT NULL DEFAULT 48,
  notify_expiring_perks_scope   text     NOT NULL DEFAULT 'all_nearby'
    CONSTRAINT notify_scope_check CHECK (notify_expiring_perks_scope IN ('all_nearby', 'interacted_only')),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notification preferences"
  ON public.user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Venue interaction tracking
CREATE TABLE IF NOT EXISTS public.user_venue_interactions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id       uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  interacted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

ALTER TABLE public.user_venue_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own venue interactions"
  ON public.user_venue_interactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Deduplication guard for push notifications
CREATE TABLE IF NOT EXISTS public.perk_notifications_sent (
  user_id       uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id  uuid  NOT NULL REFERENCES public.venue_promotions(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, promotion_id)
);
