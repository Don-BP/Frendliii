# Venue Portal Rebuild — Design Spec
**Date:** 2026-03-19
**Sub-project:** 1 of 2 (Venue Portal; mobile hangout map picker is Sub-project 2)
**Status:** Approved

---

## 1. Overview

Rebuild the venue partner portal (`venue-portal/`) from a UI prototype with hardcoded state into a fully functional, Supabase-connected web application. The portal is the primary tool through which venue partners manage their RealConnect listing, promotions, and coupon redemptions.

The portal must work well on both desktop (venue managers at a desk) and mobile (small business owners managing from their phone). The venue's pinned map location is mandatory during registration and flows directly into the mobile app's SafeArrival system and proximity matching.

This is **Sub-project 1**. The mobile app's custom-location map picker for personal hangouts is scoped to Sub-project 2.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React + TypeScript (existing) |
| Styling | Tailwind CSS (existing) |
| Backend | Supabase (shared with mobile app) |
| Auth | Supabase Auth — email/password for owners |
| Staff Auth | Supabase Edge Functions — PIN verified server-side, returns scoped JWT |
| Storage | Supabase Storage — venue logos and cover photos |
| Map | Google Maps JS API (env-gated; text input fallback when key absent) |
| Payment | Tier stored in DB with payment status flag; Stripe hook stubbed for later |

---

## 3. Architecture

### Auth Model

Two roles share the same login page with a toggle:

**Owner** — authenticates via Supabase email/password (`signInWithPassword()`). Full Supabase session managed by `supabase.auth.onAuthStateChange`. Session is persisted in localStorage and automatically refreshed by the Supabase client. On session expiry or network failure, user is redirected to login.

**Staff** — authenticates via a 4-digit PIN set by the venue owner. Staff never get Supabase accounts. The PIN is verified server-side by the `verify-staff-pin` Edge Function (see Section 4). The function returns a short-lived JWT stored in memory only. Staff can only call the `redeem-coupon` Edge Function — no direct DB access. Session expires after 8 hours; if the JWT is rejected (expired or invalid), the staff UI immediately redirects to the PIN entry screen with the message "Session expired — please enter the PIN again."

### One Account = One Venue

`venues.id` equals the Supabase auth user's UID — a strict one-account-to-one-venue mapping. This is intentional for the current scope. Multi-venue management is explicitly out of scope and would require a schema change.

### Map Pin Component

```ts
type MapLocation =
  | { lat: number; lng: number; address: string }   // full pin from Google Maps
  | { lat: null; lng: null; address: string };       // address-only fallback (no API key)

interface MapPickerProps {
  value: MapLocation | null;
  onChange: (location: MapLocation) => void;
}
```

**When `VITE_GOOGLE_MAPS_API_KEY` is set:** renders an interactive Google Maps embed with a draggable pin. Address is reverse-geocoded. The Maps JS API script is loaded lazily (only when `<MapPicker>` renders). The key must be restricted to the portal's domain in Google Cloud Console.

**When key is absent:** renders a text address input. Output is `{ lat: null, lng: null, address: string }`.

Used in both registration Step 3 and the Profile page.

### SafeArrival Null Guard (Mobile App — must be delivered with this spec)

The mobile app (`frendli-app/app/chat/[id].tsx`) currently has an incomplete guard: it checks `matchHangout?.venue?.lat && matchHangout?.venue?.lng` before activating SafeArrival. This check is correct in principle but must be verified to handle the `null` case cleanly (i.e., when venue.lat is `null`, `setSafeArrivalConfig` and `scheduleSafeArrivalEscalation` must NOT be called and no TypeScript `null`-cast-as-`number` must occur). This guard is a required deliverable of this spec, even though it is a mobile app change, because it protects against unsafe behaviour when venues registered without a map key.

### Data Flow to Mobile App

The `venues` table is shared with the mobile app. Once a venue saves their location, `lat` and `lng` are immediately available to SafeArrival, the Activity Planner, and hangout venue suggestions. Venues with `lat = null` see a persistent prompt on their Profile page to pin their location.

---

## 4. Database Schema

### `venues` table

```sql
create table venues (
  id                  uuid primary key references auth.users(id),
  name                text not null,
  category            text not null check (category in (
                        'cafe', 'bar', 'restaurant', 'bowling_alley',
                        'karaoke', 'escape_room', 'activity_venue', 'other'
                      )),
  description         text,
  address             text,
  lat                 float8,
  lng                 float8,
  phone               text,
  email               text,
  website             text,
  logo_url            text,
  cover_url           text,
  hours               jsonb,
  -- hours shape: { mon: { open: "08:00", close: "20:00", closed: false }, tue: {...}, ... }
  -- days: mon, tue, wed, thu, fri, sat, sun
  -- time strings in 24h "HH:MM" format; closed: true means the venue is closed that day
  tier                text not null default 'listed' check (tier in ('listed', 'perks', 'premier')),
  tier_payment_status text not null default 'none' check (tier_payment_status in ('none', 'pending', 'active')),
  staff_pin_hash      text,   -- bcrypt hash of owner-set 4-digit PIN; set via Edge Function only
  staff_pin_locked_until timestamptz,  -- set when lockout triggered; NULL = not locked
  is_active           boolean not null default true,
  registration_step   int not null default 1,
  -- registration_step values: 1=account created, 2=details saved, 3=location saved, 4=complete
  created_at          timestamptz not null default now()
);

alter table venues enable row level security;
create policy "owner read-write" on venues
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "app read active" on venues
  for select using (is_active = true);
```

**`tier_payment_status` logic:**
- `'none'` — Free (Listed) tier; no payment needed; full Listed features active
- `'pending'` — Venue selected a paid tier but payment not confirmed; features remain at Listed level
- `'active'` — Payment confirmed; full tier features unlocked

Tier-gated features (Promotions CRUD, Redemption analytics) check `tier IN ('perks','premier') AND tier_payment_status = 'active'`.

**Registration completion:** `registration_step = 4` means registration is complete. A returning user with `registration_step < 4` is redirected to the appropriate wizard step after login.

### `venue_promotions` table

```sql
create table venue_promotions (
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
```

### `venue_redemptions` table

```sql
create table venue_redemptions (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues(id) on delete cascade,
  promotion_id   uuid not null references venue_promotions(id),
  code           text not null unique,
  -- 6-char uppercase alphanumeric, charset: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
  -- (excludes O, 0, I, 1 to avoid visual ambiguity at a counter)
  redeemed_at    timestamptz,    -- null = claimed but not yet validated at counter
  claimed_at     timestamptz not null default now(),
  user_ref       text            -- SHA-256 hash of the claiming user's Supabase UUID; not PII
);

alter table venue_redemptions enable row level security;
create policy "owner read-write" on venue_redemptions
  using (auth.uid() = venue_id)
  with check (auth.uid() = venue_id);
-- Note: auth.uid() = venue_id works because venues.id = auth.uid() (1:1 mapping).
-- If the schema ever allows multiple venues per user, this policy must be revisited.
```

**Row lifecycle:** The **mobile app** creates a `venue_redemptions` row when a user claims a coupon. The `code` is generated at claim-time (by the mobile app or a shared backend function). The portal only reads these rows and sets `redeemed_at` on confirmation.

### Supabase Storage

Bucket: `venue-assets`
- **Public-read** — logos and cover photos are served publicly to the app and portal
- **Owner-write** — Storage RLS policy restricts uploads to paths matching `/{venue_id}/*` where `venue_id = auth.uid()`

### Edge Functions

All three Edge Functions share the env var `STAFF_JWT_SECRET` (a random 256-bit string). JWTs are signed with HS256.

---

**`verify-staff-pin`** — public, no auth required

Input: `{ venue_id: string, pin: string }`

Logic:
1. Check `venues.staff_pin_locked_until` for the given `venue_id`. If locked and `now() < locked_until`, return 429 with seconds remaining.
2. bcrypt-compare the input PIN against `venues.staff_pin_hash` (using `https://deno.land/x/bcrypt` in the Deno runtime).
3. **On mismatch:** increment a per-venue fail counter (stored in a Supabase ephemeral cache or in a `staff_pin_fail_count` column). After 10 consecutive failures, set `staff_pin_locked_until = now() + interval '15 minutes'` and return 429. Otherwise return 401 with a 500ms artificial delay.
4. **On match:** reset fail counter, return signed JWT: `{ role: 'staff', venue_id, exp: now + 8h }`.
5. **Additional rate limit:** max 5 calls per IP per minute (enforced in the Edge Function, using Supabase KV or a simple in-memory map with a rolling window).

Note: add `staff_pin_fail_count int not null default 0` and `staff_pin_locked_until timestamptz` to the `venues` schema (already included above).

---

**`update-staff-pin`** — requires owner Supabase JWT in Authorization header

Input: `{ new_pin: string }` (4 digits, validated)

Logic:
1. Verify the Supabase JWT, extract `auth.uid()`.
2. bcrypt-hash the new PIN.
3. Update `venues.staff_pin_hash`, reset `staff_pin_fail_count = 0`, clear `staff_pin_locked_until`.
4. Return 200.

The browser never sees or sends a raw or hashed PIN directly to Supabase — all PIN operations go through this function.

---

**`redeem-coupon`** — requires staff JWT in Authorization header

Input: `{ code: string, action: 'check' | 'confirm' }`

Logic:
1. Verify the staff JWT using `STAFF_JWT_SECRET`. On failure (expired/invalid), return 401.
2. Extract `venue_id` from the JWT.
3. Look up `venue_redemptions` where `code = input.code`.
   - If not found → return `{ status: 'invalid' }`.
   - **Critically:** verify `redemption.venue_id = jwt.venue_id`. If mismatch → return `{ status: 'invalid' }` (do not reveal the code belongs to another venue).
4. Look up the linked `venue_promotions` row. Check `valid_until > now()`.
   - If expired → return `{ status: 'expired', promotion_title }`.
5. If `redeemed_at IS NOT NULL` → return `{ status: 'already_redeemed', redeemed_at, promotion_title, discount }`.
6. **`action: 'check'`** → return `{ status: 'valid', promotion_title, discount, valid_until }`. Do NOT set `redeemed_at`.
7. **`action: 'confirm'`** → set `redeemed_at = now()`, return `{ status: 'confirmed', promotion_title, discount }`.

The two-action design prevents accidental redemptions: the portal calls `check` first, shows the confirmation card, then calls `confirm` only when the staff member explicitly taps "Confirm Redemption."

---

## 5. Registration Wizard

A 4-step wizard with a step indicator at the top. Partial registration is supported: Step 1 creates the auth user and a stub `venues` row simultaneously (`registration_step = 1`). If the user abandons the wizard and logs in later, they are redirected back to the step corresponding to their current `registration_step`. `registration_step = 4` marks completion.

### Step 1 — Account
- Email (validated format), password (min 8 chars), confirm password
- On submit: `supabase.signUp()` → on success, insert stub `venues` row with `id = auth.uid()`, `registration_step = 1`

### Step 2 — Venue Details
- Venue name (required)
- Category (dropdown, values from the DB enum: Café, Bar, Restaurant, Bowling Alley, Karaoke, Escape Room, Activity Venue, Other)
- Phone number, description (max 300 chars), logo upload (optional), operating hours (per-day picker)
- On submit: update `venues` row, set `registration_step = 2`

### Step 3 — Location (mandatory)
- `<MapPicker>` component
- Cannot advance until `onChange` has fired (location confirmed)
- Address shown below map for confirmation
- Without API key: address text input; informational banner about map pin
- On submit: save `lat`, `lng`, `address` to `venues`, set `registration_step = 3`

### Step 4 — Tier Selection
Three cards (side by side on desktop, stacked on mobile):
- **Listed Partner** — Free: basic listing, visible to users planning hangouts
- **Perks Partner** — ¥12,000/month (first 3 months free): featured badge, coupon program, redemption dashboard, foot traffic reports (future)
- **Premier Partner** — ¥36,000/month: all Perks features + exclusive category, top-of-feed, co-branded promotions, dedicated support

**Free selected:** "Complete Registration" → set `tier = 'listed'`, `tier_payment_status = 'none'`, `registration_step = 4` → redirect to Dashboard.

**Paid selected:** "Continue to Payment" → set `tier = 'perks'/'premier'`, `tier_payment_status = 'pending'`, `registration_step = 4` → show stub screen: "We'll reach out to complete your subscription. Your account is active at Listed tier in the meantime." → redirect to Dashboard. Paid features remain locked until `tier_payment_status` is set to `'active'` (manually by admin until Stripe is integrated).

---

## 6. Portal Pages

### Login
- Toggle: "Owner Login" / "Staff Login"
- **Owner:** email + password → `supabase.signInWithPassword()` → redirect to Dashboard (or to incomplete registration step if `registration_step < 4`)
- **Staff:** venue ID input + 4-digit PIN → `verify-staff-pin` Edge Function → store returned JWT in memory → redirect to Redemption
- "Don't have an account? Register your venue" link

### Dashboard (owner only)
Summary cards (2-col on mobile, 4-col on desktop):
- **Redemptions this month** — count of `venue_redemptions` where `redeemed_at` is in the current calendar month
- **All-time redemptions** — total count of rows with `redeemed_at IS NOT NULL`
- **Active promotions** — count of `venue_promotions` where `is_active = true AND valid_until > now()`
- **Current tier** — badge (Listed / Perks / Premier); upgrade CTA if Listed or `tier_payment_status = 'pending'`

Bar chart: redemptions per day for the last 30 days.

Upgrade prompt banner for Listed-tier or pending-payment venues.

> **Note:** "Foot traffic reports" (visits confirmed by SafeArrival) require a `venue_visits` table written by the mobile app's SafeArrival system. This data does not exist yet. The feature is listed in the Perks tier benefits for marketing purposes but is **out of scope** for this build. The dashboard shows redemption counts only.

### Profile (owner only)
Editable form with sections:
1. **Branding** — logo upload, cover photo upload (Supabase Storage `venue-assets` bucket, path `/{venue_id}/logo` and `/{venue_id}/cover`)
2. **Details** — name, category, phone, email, website, description
3. **Location** — `<MapPicker>`; persistent prompt shown if `lat IS NULL`
4. **Hours** — per-day open/close time inputs (24h "HH:MM"), closed toggle per day (Mon–Sun)
5. **Staff Access** — set/change 4-digit PIN (calls `update-staff-pin` Edge Function; browser never sends raw or hashed PIN to DB directly). Shows lockout status if PIN is currently locked.
6. **Tier** — current tier + payment status display; "Upgrade / Contact Us" stub button

Single "Save Changes" button at bottom for sections 1–4. Staff PIN and Tier sections have their own action buttons.

### Promotions (owner only)
**Access check:** if `tier = 'listed'` OR `tier_payment_status != 'active'` → show locked state. Locked state: greyed-out promotion preview cards + upgrade CTA. The Promotions tab is visible in both desktop sidebar and mobile bottom tab bar for all owners; the locked state appears on page load.

**Perks/Premier with `tier_payment_status = 'active'`:**
- List of promotions (active and past): title, discount, date range, redemption count, active toggle, edit button
- "New Promotion" button opens a slide-in form: title, discount text, valid from/until date pickers, active toggle
- Promotions can be edited or deactivated at any time

### Redemption (owner + staff)
Counter-facing screen, optimised for mobile.

Two-step flow:
1. 6-character code input — auto-uppercases, strips characters outside `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, caps at 6 chars. "Check Code" button disabled until exactly 6 valid chars entered.
2. "Check Code" → calls `redeem-coupon` with `action: 'check'`
3. **Valid (unredeemed):** green card with promotion title, discount, expiry → "Confirm Redemption" button → calls `redeem-coupon` with `action: 'confirm'` → success state
4. **Already redeemed:** red card with timestamp of redemption
5. **Invalid / expired / wrong venue:** red card with reason

QR code scanning is **explicitly out of scope** for this build. The existing prototype's "Scan QR" toggle must be removed. A code-based flow only.

On staff JWT expiry (401 from Edge Function): immediately redirect to PIN entry screen with message "Your session has expired. Please enter the PIN to continue."

---

## 7. Navigation

### Desktop (≥768px)
Persistent left sidebar:
- Venue logo + name at top
- Nav links: Dashboard, Promotions, Redeem, Profile
- Current tier badge (shows "Payment Pending" if `tier_payment_status = 'pending'`)
- Logout at bottom

Staff sidebar: Redeem link only.

### Mobile (<768px)
Bottom tab bar:
- Dashboard (owner only)
- Promotions (owner only — tab is visible for all owners; locked state shown on page for Listed/pending-payment)
- Redeem
- Profile (owner only)

Staff: Redeem tab only; all other tabs hidden.

---

## 8. Responsive Design

The portal must be fully usable on a 375px-wide mobile browser with no horizontal scrolling. Key adaptations:
- Registration wizard steps stack vertically; map fills full width of the viewport
- Dashboard cards: 2-column grid on mobile, 4-column on desktop
- Promotions list becomes card stack on mobile
- Sidebar hidden on mobile; bottom tab bar shown instead
- All form inputs full-width on mobile
- Redemption screen: large text input, large buttons, high contrast — the primary mobile-optimised screen

---

## 9. Map Component — Google Maps Integration Detail

**Environment variable:** `VITE_GOOGLE_MAPS_API_KEY`

**The API key must be restricted** to the portal's domain in Google Cloud Console (HTTP referrer restriction) before production deployment.

**With key:**
- Google Maps JS API loaded lazily via script tag only when `<MapPicker>` renders
- Map centered on user's browser geolocation; fallback to Osaka city center (34.6937° N, 135.5023° E) since the initial launch city is Osaka
- Draggable marker; on drop → reverse geocode → populate address field
- Search box overlay: type an address → geocode → move pin
- Output: `{ lat: number, lng: number, address: string }`

**Without key:**
- Text address input only
- Output: `{ lat: null, lng: null, address: string }`
- Banner: "Interactive map will be enabled once Google Maps API is configured. Your venue will still appear in listings but SafeArrival precision will be limited until a location is pinned."

---

## 10. Redemption Code Format

**Charset:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars; excludes `O`, `0`, `I`, `1`)
**Length:** 6 characters
**Example:** `GK4M7R`
**Generation:** by the mobile app (or backend function) at coupon claim time. The portal validates and redeems only — it never generates codes.
**Input UX:** auto-uppercase, invalid characters stripped on input, "Check Code" button disabled until exactly 6 valid characters are present.

---

## 11. Out of Scope (Sub-project 2 or future)

- Mobile app hangout creation map picker for custom/personal meeting locations (Sub-project 2)
- Stripe / payment processing integration
- Foot traffic reports and `venue_visits` table
- QR code scanning on the Redemption page
- Push notifications to venue owners
- Advanced analytics (heatmaps, peak hours, demographic breakdown)
- Admin panel for Frendli staff to manage venue accounts
- Multi-venue management per owner account

---

## 12. Success Criteria

- A venue owner can register, confirm their location, select a tier, and reach their dashboard in under 10 minutes
- Venue `lat`/`lng` is saved to Supabase and resolves the SafeArrival silent-skip in the mobile app
- The SafeArrival null guard in the mobile app correctly skips activation when `venue.lat` is `null`
- The portal is fully usable on a 375px mobile browser without horizontal scrolling
- Staff can validate a redemption code in under 10 seconds from landing on the Redemption page
- All portal pages reflect live Supabase data — no hardcoded state remains
- Paid tier features are locked until `tier_payment_status = 'active'`; selecting a paid tier during registration does not grant feature access
- Staff PIN is never sent as a raw string from the browser to the Supabase DB; all PIN operations go through Edge Functions
- A 10-failure lockout is applied per venue to the staff PIN entry
