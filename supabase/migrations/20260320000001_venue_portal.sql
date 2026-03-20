-- supabase/migrations/20260320000001_venue_portal.sql

-- venues table
create table if not exists venues (
  id                    uuid primary key references auth.users(id),
  name                  text not null,
  category              text not null check (category in (
                          'cafe', 'bar', 'restaurant', 'bowling_alley',
                          'karaoke', 'escape_room', 'activity_venue', 'other'
                        )),
  description           text,
  address               text,
  lat                   float8,
  lng                   float8,
  phone                 text,
  email                 text,
  website               text,
  logo_url              text,
  cover_url             text,
  hours                 jsonb,
  tier                  text not null default 'listed' check (tier in ('listed', 'perks', 'premier')),
  tier_payment_status   text not null default 'none' check (tier_payment_status in ('none', 'pending', 'active')),
  staff_pin_hash        text,
  staff_pin_fail_count  int not null default 0,
  staff_pin_locked_until timestamptz,
  is_active             boolean not null default true,
  registration_step     int not null default 1,
  created_at            timestamptz not null default now()
);

alter table venues enable row level security;
create policy "owner read-write" on venues
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "app read active" on venues
  for select using (is_active = true);

-- venue_promotions table
create table if not exists venue_promotions (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references venues(id) on delete cascade,
  title        text not null,
  description  text,
  discount     text not null,
  valid_from   timestamptz not null,
  valid_until  timestamptz not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table venue_promotions enable row level security;
create policy "owner read-write" on venue_promotions
  using (auth.uid() = venue_id)
  with check (auth.uid() = venue_id);
create policy "app read active" on venue_promotions
  for select using (is_active = true and valid_until > now());

-- venue_redemptions table
create table if not exists venue_redemptions (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues(id) on delete cascade,
  promotion_id   uuid not null references venue_promotions(id),
  code           text not null unique,
  redeemed_at    timestamptz,
  claimed_at     timestamptz not null default now(),
  user_ref       text
);

alter table venue_redemptions enable row level security;
create policy "owner read-write" on venue_redemptions
  using (auth.uid() = venue_id)
  with check (auth.uid() = venue_id);

-- Storage bucket for venue assets
insert into storage.buckets (id, name, public)
  values ('venue-assets', 'venue-assets', true)
  on conflict (id) do nothing;

-- Storage RLS: owners can upload to their own path
create policy "owner upload" on storage.objects
  for insert with check (
    bucket_id = 'venue-assets' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "public read" on storage.objects
  for select using (bucket_id = 'venue-assets');
