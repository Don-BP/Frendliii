-- Add peak hours and vibe fields to venues
alter table venues
  add column if not exists peak_hours jsonb,
  add column if not exists vibes      text[];
