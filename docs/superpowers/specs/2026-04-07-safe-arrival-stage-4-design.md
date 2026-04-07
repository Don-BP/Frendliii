# SafeArrival Stage 4 — Design Spec
**Date:** 2026-04-07
**Status:** Approved

---

## Overview

Extends the existing SafeArrival escalation system (Stages 1–3) with:
- Stage 4 authority escalation (police-share link, opt-in)
- Server-side safety net so escalation survives phone death
- Geofence-aware `likely_safe` status to avoid false emergency contact alerts
- User-configurable escalation timing
- Tabbed Safety Settings screen with incident history
- Permanent incident records with status tracking
- Emergency contact landing page with call / email / copy actions

---

## Escalation Flow

```
Hangout activates
      │
      ▼
Stage 1 — at hangout time
  Push: "Are you at [Venue] yet?" → "Just arrived" / "Running late"
      │ no response after stage2_delay_min
      ▼
Stage 2 — follow-up
  Push + SMS: "Are you okay?" → "I'm fine" / "Running late" / "I need help"
  "I need help" → jump straight to Stage 3
      │
      ├─ Phone IN geofence → status = likely_safe
      │    Send reminder every reminder_interval_min until user confirms
      │    If phone LEAVES geofence → revert to active, re-check contact_delay
      │
      └─ Phone NOT in geofence, no response after contact_delay_min
           ▼
         Stage 3 — emergency contact notified
           SMS + email to emergency contact
           If stage4_enabled → include police-share link in message
           Create safety_incident record
      │
      ▼
Stage 4 (opt-in) — landing page includes police-share actions
```

User tapping "I'm Safe" at any point resolves the session immediately.

---

## Data Model

### `user_safety_settings` (one row per user)
| Column | Type | Default |
|--------|------|---------|
| `user_id` | uuid PK FK users | |
| `emergency_contact_name` | text | |
| `emergency_contact_phone` | text | |
| `emergency_contact_email` | text | |
| `stage2_delay_min` | int | 10 |
| `contact_delay_min` | int | 30 |
| `reminder_interval_min` | int | 30 |
| `stage4_enabled` | boolean | false |
| `updated_at` | timestamptz | |

### `safety_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `hangout_id` | uuid FK | |
| `venue_lat` | float | |
| `venue_lng` | float | |
| `venue_name` | text | |
| `venue_address` | text | |
| `other_person_first_name` | text | |
| `scheduled_time` | timestamptz | hangout time |
| `stage` | int | 1–3, current escalation stage |
| `status` | text | `active` \| `likely_safe` \| `resolved` |
| `stage2_delay_min` | int | snapshot of user setting at session start |
| `contact_delay_min` | int | snapshot |
| `reminder_interval_min` | int | snapshot |
| `stage4_enabled` | boolean | snapshot |
| `last_known_lat` | float | updated by check-in |
| `last_known_lng` | float | updated by check-in |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | null until resolved |

### `safety_incidents`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `safety_session_id` | uuid FK | |
| `user_id` | uuid FK | |
| `emergency_contact_name` | text | snapshot |
| `emergency_contact_phone` | text | snapshot |
| `emergency_contact_email` | text | snapshot |
| `report_token` | uuid | URL token for landing page, never expires |
| `status` | text | `active` \| `likely_safe` \| `resolved` |
| `police_link_accessed` | boolean | default false |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | |

---

## Backend

### New API routes (`frendli-api/src/routes/safety.ts`)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/safety/session/start` | Create `safety_sessions` row with user settings snapshot. Called when hangout activates SafeArrival. |
| `POST` | `/api/safety/session/resolve` | Mark active session + linked incident as `resolved`. Called when user taps "I'm Safe". |
| `GET` | `/api/safety/incidents` | Return user's `safety_incidents` list (newest first) for History tab. |

Extend existing:
- `POST /api/safety/check-in` — update `last_known_lat/lng` on active session; if within `GEOFENCE_RADIUS_M` (200m) of venue, flip session status to `likely_safe`.

### New Supabase edge functions

**`safety-escalation`** (called by pg_cron every 5 min)
- Query all `safety_sessions` where `status != 'resolved'`
- For each session, evaluate:
  - If `stage = 1` and `now >= scheduled_time + stage2_delay_min` and no user response → advance to stage 2, fire push + SMS
  - If `stage = 2` and `status = likely_safe` → send reminder notification if `reminder_interval_min` has elapsed since last reminder
  - If `stage = 2` and `status = active` and `now >= stage2_fired_at + contact_delay_min` → advance to stage 3, call `safety-notify-contact`
- Does not re-fire if already at correct stage

**`safety-notify-contact`**
- Creates `safety_incidents` row with `report_token = gen_random_uuid()`
- Sends email via Resend to emergency contact with incident summary + landing page link
- Sends SMS via Twilio (or equivalent) to emergency contact phone
- If `stage4_enabled`, message explicitly mentions the police-share link on the landing page

**`safety-report`** (public, no auth required)
- Accepts `?token=<report_token>`
- Looks up `safety_incidents` by token
- Returns a plain HTML page (see Frontend section)
- On access, sets `police_link_accessed = true` if user clicks the police-share section

### pg_cron job
```sql
select cron.schedule(
  'safety-escalation-check',
  '*/5 * * * *',
  $$ select net.http_post(url := '[project_url]/functions/v1/safety-escalation', ...) $$
);
```

---

## Frontend

### Safety Settings screen (`frendli-app/app/safety-settings.tsx`)

Two tabs:

**Settings tab:**
- Emergency contact name, phone, email fields
- Stage 2 delay picker: 5 / 10 / 15 / 20 min (default: 10)
- Emergency contact delay picker: 15 / 30 / 60 / 120 min (default: 30)
- Likely-safe reminder interval picker: 15 / 30 / 60 min (default: 30)
- Stage 4 toggle: "Include police-share link in emergency alert" (default: off)
- Save button → upserts `user_safety_settings`

**History tab:**
- List of `safety_incidents` newest first
- Each row: venue name, date, status badge (`Active` = red, `Likely Safe` = amber, `Resolved` = green)
- Tap to expand: venue address, meetup time, other person's first name, escalation timestamp

### Existing file changes

**`frendli-app/lib/safety-location.ts`:**
- `setSafeArrivalConfig()` — also calls `POST /api/safety/session/start`
- `confirmUserSafe()` — also calls `POST /api/safety/session/resolve`
- Background task — after updating check-in, if within geofence and session is `likely_safe`, schedule a local reminder notification at `reminder_interval_min`; if geofence exited while `likely_safe`, call API to revert status to `active`
- `scheduleSafeArrivalEscalation()` — client still schedules local notifications for UX responsiveness; server is the safety net

**`frendli-app/app/(tabs)/profile.tsx` (or settings screen):**
- Add "Safety Settings" navigation entry

### Emergency contact landing page (HTML from `safety-report` edge function)

- Dark background, high-contrast white/red text
- Status banner at top: red `ACTIVE ALERT` / amber `LIKELY SAFE — phone detected at venue` / green `RESOLVED — user confirmed safe`
- Incident summary block: user's name, venue name + address, scheduled meetup time, other person's first name, last known location as Google Maps link
- Three action buttons (large, full-width):
  1. **Call Emergency Services** — `tel:` link; country detected from `Accept-Language` header, defaults to 911
  2. **Email Report** — `mailto:` with pre-filled subject ("SafeArrival Alert — [Name]") and body (full incident summary)
  3. **Copy Report** — copies formatted plain-text report to clipboard
- Footer: "This report was generated by Frendli SafeArrival. Generated [timestamp]."

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Hybrid client + server escalation | Client notifications are immediate UX; server ensures escalation survives phone death |
| Settings snapshots on session start | User changing settings mid-hangout won't affect an in-progress safety session |
| `likely_safe` status pauses escalation | Phone at venue = almost certainly fine; avoid false emergency contact panic |
| Report token never expires | Permanent incident record; emergency contact / police can reference it indefinitely |
| User-configurable delays | Safety comfort levels vary widely; one-size-fits-all is wrong for this feature |
| Stage 4 opt-in only | Police escalation is serious — must be deliberate, not default |
| No auto-resolve | Cannot distinguish "fine and forgot" from "in danger" — safest default is stay active |
