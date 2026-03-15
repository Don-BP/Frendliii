# Hangouts Page — Design Spec
**Date:** 2026-03-16
**Status:** Approved

---

## Overview

This spec covers the full redesign and feature completion of the Hangouts page (`frendli-app/app/(tabs)/hangouts.tsx`) and its sub-screens. The goal is to implement all features described in the RealConnect Development Document v2, strengthen the venue partnership monetization layer, and improve the user experience for discovering hangouts and managing plans.

---

## 1. Page Architecture

The Hangouts page keeps its existing two-tab structure (My Plans / Discover) with targeted additions to each tab.

### Discover Tab — top to bottom
1. Header — title ("Hangouts"), dynamic subtitle ("X happening near you"), Host button
2. My Plans / Discover main toggle (unchanged)
3. Activity Planner banner — links to `/hangouts/plan` (unchanged)
4. Category filter strip — expanded (see Section 4)
5. **"For You" venue strip** — NEW. Horizontal scroll of partner venue cards. Visible for all filters except "Suggested" (where it is replaced by the merged feed). Hidden if no partner venues match the active filter category.
6. **"Nearby Hangouts" grid** — existing vertical card list (unchanged format)

### My Plans Tab — top to bottom
1. Header (unchanged)
2. My Plans / Discover main toggle (unchanged)
3. **Upcoming / Past pill toggle** — NEW. Secondary pill switch below the main toggle. Defaults to "Upcoming".
4. Upcoming view — real data from API, future hangouts
5. Past view — real data from API, past hangouts (accessed via Past toggle)

---

## 2. "For You" Venue Strip

### Purpose
The enticement layer. Shows partner venues with active deals near the user, personalized by their interests. This is the advertising surface for paying venue partners — visible, contained, and honest.

### Placement
Sits between the category filter strip and the "Nearby Hangouts" grid. Section header: **"Venues with deals near you"** with a small gift icon (🎁).

### Card Format — compact, ~260×140pt, horizontal scroll
- Venue photo (top half, full bleed)
- **"Featured" badge** — top-left corner, small pill, amber/gold color. Premier partners only. No badge on Perks partners.
- Venue name (bold)
- Category + distance row (e.g., "Board Game Café · 0.3km")
- Deal text row in primary coral color: `🎁 First hour free with any group booking`
- Tapping opens a venue detail bottom sheet (not a new screen) with: full venue info, photos, opening hours, full deal description, and a **"Plan a Hangout Here →"** CTA that pre-fills the hangout creation flow with the venue selected

### Ordering
1. Premier partners (fixed rank boost, ordered by proximity)
2. Perks partners (ordered by interest match score, then proximity)

### Visibility rules
- Strip is hidden entirely when a specific category filter is active and no partner venues match that category
- Strip is hidden on the My Plans tab
- Strip is **conditionally hidden** (not animated) when "Suggested" filter is active — the `featuredVenues` state is not cleared, the strip component simply does not render. Venues appear instead via the merged `DiscoveryItem[]` feed from `fetchData`. No transition animation.

---

## 3. Venue Partnership Tiers — User-Facing Behaviour

### Listed Partner (Free)
- Appears in the Activity Planner venue directory when a user is actively planning a hangout
- Does NOT appear in the "For You" strip
- No badge, no deal text
- No coupon program

### Perks Partner (~$99/month)
- Appears in the "For You" strip
- Deal text shown on card in primary color
- No tier badge/label visible to users
- Coupon unlocks in the Perks screen after user confirms a hangout at this venue

### Premier Partner (~$299/month)
- Appears first in the "For You" strip (above Perks partners)
- Deal text shown on card in primary color
- **"Featured" badge** displayed on card in the "For You" strip (amber/gold pill, top-left of photo)
- In the Suggested merged feed: shows **"Suggested for you"** label (same as Perks partners in that view — the "Featured" badge does not appear in the merged feed for any tier)
- Coupon unlocks in the Perks screen after user confirms a hangout at this venue

### Coupon unlock rule
Coupons are only unlocked in the Perks screen after a user **confirms a meetup** at a partner venue through the app. On the Perks screen, unearned partner venue deals are shown in a locked/preview state with a "Confirm a hangout here to unlock" prompt. This preserves the coupon's conversion value while giving venues advertising exposure to all users.

---

## 4. Category Filter Strip

### Composition
A dynamically composed horizontal scroll strip:

**Fixed chips (always present, always first):**
- All
- Suggested
- This Week

**Dynamic activity chips (from user's saved interest tags):**
Rendered from the user's profile interests, mapped to display labels. Examples: Board Games, Hiking, Coffee, Trivia, Karaoke, Yoga, Live Music. Only the user's own interests appear — the strip feels personal, not generic.

**Venue type chips (always last):**
Cafe · Bar · Restaurant · Activities

### Filter behaviours
- **All** — shows the full "For You" strip + full hangouts grid
- **Suggested** — merges the two layers into one ranked feed (see below)
- **This Week** — filters hangouts grid to `startTime` within next 7 days; "For You" strip remains (venues are not time-bound)
- **Activity/venue type chip** — filters hangouts grid by category; "For You" strip filters to matching partner venue categories only, hidden if no matches

### "Suggested" merged feed
When "Suggested" is active, the "For You" strip disappears and partner venue cards (full-width, matching hangout card dimensions) are interspersed with nearby hangout cards in a single ranked feed.

**Ranking factors (backend, `suggested=true` query param):**
1. Interest tag match between user profile and hangout/venue category
2. Active deal present (Perks/Premier venues boosted)
3. Proximity
4. Premier partner fixed rank boost (applied on top of above — cannot override a highly compatible result entirely)

Partner venue cards in this view show a **"Suggested for you"** label instead of "Featured" badge, communicating personalization rather than advertising.

---

## 5. My Plans Tab

### Upcoming / Past pill toggle
- Small secondary pill switch, lighter visual weight than the main tab toggle
- Positioned directly below the main My Plans / Discover toggle
- Defaults to "Upcoming" on every visit (state not persisted)

### Upcoming view
- Data source: `GET /api/hangouts/my`, filtered client-side to `startTime > now`, ordered by date ascending
- Card format: existing `HangoutCard`
- Addition: if hangout venue is a Perks/Premier partner, show a small `🎁 Deal unlocked` chip on the card; tapping deep-links to the active coupon on the Perks screen
- Empty state: existing "No plans yet" empty state with Browse Hangouts + Host a Hangout CTAs

### Past view
- Data source: same `/api/hangouts/my` response, filtered client-side to `startTime < now`, ordered newest first
- Visual treatment: slightly desaturated card style (muted, no shadow) to clearly distinguish from upcoming
- Attendee avatars remain visible (users want to recall who they went with)
- **Fields suppressed on past cards**: `spotsLeft` badge is hidden (irrelevant for completed hangouts). The "Featured" deal chip is also hidden.
- **"Do it again →"** button on each card: navigates to `/hangouts/create` with query params `venueId=<id>&category=<slug>`. The create screen uses these to pre-fill venue and category. Attendees are NOT pre-invited automatically — the create screen surfaces the same attendees from the past hangout as suggested invites in the attendee selector, but the user must confirm them. No new API field or payload change is needed; this is purely a navigation pre-fill.
- **Feedback priority**: if a hangout is within the 24-hour post-meetup feedback window (`startTime > now - 24h`) AND `feedbackSubmitted === false`, **"How'd it go? →"** replaces "Do it again →" — feedback takes priority. Add `feedbackSubmitted: boolean` to the `/api/hangouts/my` response (computed server-side: `true` if a `HangoutFeedback` record exists for this user + hangout).

---

## 6. Data & API Changes

### TypeScript interfaces (frontend)

```typescript
// PartnerVenue — used by VenuePromotionCard and VenueDetailSheet
interface PartnerVenue {
  id: string;
  name: string;
  category: string;           // matches venue category slug (e.g. 'cafe', 'bar')
  partnerTier: 'perks' | 'premier';
  dealText: string;            // e.g. "10% off your total order"
  distance: string | null;     // e.g. "0.3km away" — null if location unavailable
  photos: string[];            // array of image URLs, first used as card thumbnail
  address: string;
  openingHours: OpeningHours;  // see below
}

interface OpeningHours {
  [day: string]: { open: string; close: string } | null;
  // day keys: 'monday' | 'tuesday' | ... | 'sunday'
  // null = closed that day
  // e.g. { monday: { open: '09:00', close: '22:00' }, sunday: null }
}

// DiscoveryItem — used by the Suggested merged feed
// Discriminated union so frontend can render HangoutCard or VenuePromotionCard
type DiscoveryItem =
  | { type: 'hangout'; data: Hangout }
  | { type: 'venue'; data: PartnerVenue };
```

The `Venue` Prisma schema requires a migration to add: `partnerTier`, `dealText`, `openingHours` (JSON field), and ensure `photos` is a string array. The `openingHours` field is optional — if absent, the VenueDetailSheet shows "Opening hours not available."

### Frontend state changes (`hangouts.tsx`)

New state variables:
```typescript
const [activeTab, setActiveTab] = useState<'my_plans' | 'discover'>('discover'); // existing
const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming'); // NEW
const [activeCategory, setActiveCategory] = useState<string>('all'); // changed from string | null to string with 'all' as default
const [featuredVenues, setFeaturedVenues] = useState<PartnerVenue[]>([]); // NEW
const [venuesLoading, setVenuesLoading] = useState(false); // NEW
const [myHangouts, setMyHangouts] = useState<Hangout[]>([]); // NEW
const [myHangoutsLoading, setMyHangoutsLoading] = useState(false); // NEW
const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]); // NEW — used only when activeCategory === 'suggested'
```

`activeCategory` values:
- `'all'` — All filter (replaces `null`)
- `'suggested'` — Suggested filter
- `'this_week'` — This Week filter
- Any interest tag slug (e.g. `'board_games'`, `'hiking'`) — activity filter
- Any venue type slug (e.g. `'cafe'`, `'bar'`) — venue type filter

### `fetchData` restructure

```typescript
const fetchData = useCallback(async () => {
  // Always fetch discovery hangouts
  const discoveryParams: DiscoveryParams = {
    category: ['all', 'suggested', 'this_week'].includes(activeCategory) ? undefined : activeCategory,
    suggested: activeCategory === 'suggested' ? true : undefined,
    thisWeek: activeCategory === 'this_week' ? true : undefined,
  };
  const data = await hangoutApi.getDiscovery(discoveryParams);
  // Route to correct state: suggested feed uses discoveryItems, all others use hangouts
  if (activeCategory === 'suggested') {
    setDiscoveryItems(Array.isArray(data) ? (data as DiscoveryItem[]) : []);
  } else {
    setHangouts(Array.isArray(data) ? (data as Hangout[]) : []);
  }
}, [activeCategory]);

const fetchMyHangouts = useCallback(async () => {
  setMyHangoutsLoading(true);
  try {
    const data = await hangoutApi.getMy();
    setMyHangouts(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('fetchMyHangouts error:', err);
  } finally {
    setMyHangoutsLoading(false);
  }
}, []);

const fetchFeaturedVenues = useCallback(async (lat?: number, lng?: number) => {
  setVenuesLoading(true);
  // Normalize: 'all' and 'this_week' are not venue category slugs — omit category param
  const categoryParam = ['all', 'this_week'].includes(activeCategory) ? undefined : activeCategory;
  try {
    const data = await venueApi.getFeatured({ lat, lng, category: categoryParam });
    setFeaturedVenues(Array.isArray(data) ? data : []);
  } catch (err) {
    // On error: silently hide the strip (setFeaturedVenues([])) — no error UI shown
    setFeaturedVenues([]);
  } finally {
    setVenuesLoading(false);
  }
}, [activeCategory]);
// Note: fetchFeaturedVenues is called for ALL activeCategory values EXCEPT 'suggested'.
// For 'all' and 'this_week': category param is omitted (returns all partner venues).
// For activity/venue type chips: category param is passed, backend filters to matching venues.
// For 'suggested': strip is hidden, venues come from the merged fetchData call instead.
```

`useEffect` dependencies:
- `fetchData` fires when `activeCategory` changes (existing pattern, extended). Manages its own `loading`/`setLoading` state and `catch` block identical to the existing implementation pattern.
- `fetchMyHangouts` fires when `activeTab === 'my_plans'` — triggered by tab switch
- `fetchFeaturedVenues` fires when `activeTab === 'discover'` AND `activeCategory` is NOT `'suggested'` (i.e. fires for `'all'`, `'this_week'`, and all activity/venue type chips). The `category` param is passed as-is, so the backend filters to matching venues for specific chips. Does NOT fire when `activeCategory === 'suggested'` — venues for that mode come from the merged `fetchData` call.

### Geolocation

Use `expo-location` (already in the Expo ecosystem, no new native dependency). Request foreground location permission once, on first visit to the Discover tab. If permission is denied or unavailable:
- `distance` field on all venue cards shows `null` — distance row is hidden from the card
- `lat`/`lng` params omitted from API calls — backend returns venues without proximity ordering
- No error message shown to the user for this; the strip still renders minus distances

```typescript
import * as Location from 'expo-location';

const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

useEffect(() => {
  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    }
  })();
}, []);
```

### `GET /api/venues/featured` — new endpoint

```
GET /api/venues/featured?lat=<float>&lng=<float>&category=<slug>

Query params:
  lat        (optional) — user latitude
  lng        (optional) — user longitude
  category   (optional) — filter to venues of this category slug.
             Omitted for 'all' and 'this_week' filters (returns all active partner venues).
             Passed as the chip slug for activity/venue type chip filters.

Response: PartnerVenue[]

Ordering:
  1. Premier partners first
  2. Within each tier: ordered by proximity if lat/lng provided, otherwise by createdAt desc
  3. Maximum 10 results

Error handling:
  Returns empty array [] on any DB error — never 500 to the client for this non-critical surface
```

Backend implementation note: query `Venue` where `partnerTier IN ('perks', 'premier')` and `listingStatus = 'active'`.

### `GET /api/hangouts/discovery` — extended

Add to `DiscoveryParams`:
```typescript
suggested?: boolean  // triggers ranked merged feed
thisWeek?: boolean   // filters startTime to next 7 days
```

When `suggested=true`:
- Query both `Hangout` (upcoming, public) and `Venue` (partner tier perks/premier, active)
- Score each item using: interest tag match (user profile vs hangout category or venue category), active deal present, proximity, Premier fixed boost
- Return `DiscoveryItem[]` — array of `{ type: 'hangout', data: Hangout } | { type: 'venue', data: PartnerVenue }`
- Frontend renders `HangoutCard` for type `'hangout'` and full-width `VenuePromotionCard` for type `'venue'`

When `suggested=false` (default): existing behaviour unchanged, returns `Hangout[]`.

### `GET /api/hangouts/my` — extended response

Add to each hangout in the response:
```typescript
activePerksCode: string | null
// The coupon code for this hangout if the venue is a Perks/Premier partner and a coupon
// has been auto-generated (i.e. hangout is confirmed and within the redemption window).
// null if venue is not a partner, or coupon not yet generated.
// Used by the frontend to construct the Perks screen deep-link: /perks?code=RC-XXXX
```

### `hangoutApi` and `venueApi` updates (`lib/api.ts`)

```typescript
// Extend existing getDiscovery
hangoutApi.getDiscovery(params: { category?: string; suggested?: boolean; thisWeek?: boolean; lat?: number; lng?: number })

// Add
hangoutApi.getMy(): Promise<Hangout[]>  // maps to GET /api/hangouts/my (already exists in backend)

// Add
venueApi.getFeatured(params: { lat?: number; lng?: number; category?: string }): Promise<PartnerVenue[]>
```

### New components

- `VenuePromotionCard` — compact (~260×140pt) horizontal card for the "For You" strip AND full-width variant for Suggested feed. Props:
  ```typescript
  interface VenuePromotionCardProps {
    venue: PartnerVenue;
    displayContext: 'strip' | 'feed'; // 'strip' = compact, 'feed' = full-width
    onPress: () => void;
  }
  ```
  - `displayContext='strip'`: compact card, shows "Featured" badge (Premier only)
  - `displayContext='feed'`: full-width card matching HangoutCard dimensions, shows "Suggested for you" label instead of "Featured" badge

- `VenueDetailSheet` — bottom sheet on venue card tap. Props:
  ```typescript
  interface VenueDetailSheetProps {
    venue: PartnerVenue;
    onClose: () => void;
    onPlanHangout: (venue: PartnerVenue) => void; // navigates to /hangouts/create with venue pre-filled
  }
  ```

- `HangoutsSubToggle` — small Upcoming/Past pill toggle. Props:
  ```typescript
  interface HangoutsSubToggleProps {
    value: 'upcoming' | 'past';
    onChange: (value: 'upcoming' | 'past') => void;
  }
  ```

### Loading and error states

| Surface | Loading state | Error state |
|---|---|---|
| "For You" venue strip | Horizontal skeleton placeholders (3 shimmer cards) | Strip silently hidden (empty array) |
| Hangouts grid (Discover) | Existing full-screen ActivityIndicator (unchanged) | Existing empty state (unchanged) |
| My Plans / Upcoming | ActivityIndicator centred in tab area | Empty state with retry button |
| My Plans / Past | ActivityIndicator centred in tab area | Empty state: "Couldn't load past hangouts" |
| Suggested merged feed | Existing full-screen ActivityIndicator | Falls back to standard unranked discovery feed |

---

## 7. Venue Partnership Monetization — Strengthening Ideas

### What non-paying (Listed) venues get
- Appear in the Activity Planner venue directory
- Surfaced to users when planning a hangout matching the venue's category and location
- No coupon, no strip placement, no badge
- Purpose: low-friction entry point. Venues see foot traffic from RealConnect before committing to a paid tier. This seeds the directory and makes upgrade conversations easy.

### What Perks ($99/mo) venues get
- Placement in the "For You" strip
- Deal text on their venue card
- Coupon auto-unlocks for users who confirm a hangout there
- Analytics dashboard (redemptions, peak times, new vs. returning customers)
- Monthly foot traffic report

### What Premier ($299/mo) venues get
- Everything in Perks, plus:
- "Featured" badge on venue cards
- Top position in "For You" strip (above Perks partners)
- Full-width card placement in the Suggested merged feed
- Exclusive category zone (only Premier partner in their category within a defined radius)
- Co-branded in-app promotions (surfaced in Activity Planner and chat hangout suggestion cards)
- Dedicated account manager

### Suggested additional monetization strengtheners
1. **"Deal expiring soon" urgency chip** — if a Premier partner has a time-limited promotion ending within 48 hours, show a small "Ends soon" chip on their card. Creates urgency without being pushy.
2. **Post-hangout venue re-engagement** — after a user redeems a coupon at a partner venue, a 30-day follow-up nudge appears in the app: "Back at [Venue]? Your deal refreshes for your next hangout." Incentivises repeat visits and gives venues return customer data.
3. **Group deal threshold** — Perks/Premier partners can optionally set a minimum group size for their deal (e.g., "Deal applies for groups of 3+"). This drives larger groups, higher spend per visit, and more valuable customers for the venue.
4. **Venue-initiated event cards** — Premier partners can post a special event (e.g., "Quiz Night Thursday") as a full hangout card in the Discover feed, indistinguishable in format from user-hosted hangouts but labelled "Hosted by [Venue]". This blurs the line between an ad and a genuine social event, benefiting both sides.

---

## 7b. Perks Screen Changes

The Perks screen (`perks.tsx`) requires one targeted change: the "locked/preview" state for unearned partner venue deals.

### What changes
Currently `perks.tsx` renders all fetched perks identically (all claimable). The `perksApi.fetchPerks()` call must return an `earned: boolean` field per perk.

### Backend change
`GET /api/perks` (or equivalent) — add `earned: boolean` to each perk in the response. A perk is `earned: true` if the user has a confirmed hangout at that venue with an auto-generated coupon code. `earned: false` means the venue is a partner with an active deal but the user has not yet confirmed a hangout there.

### Frontend change
`PerkCard` receives an additional `earned: boolean` prop:
- `earned: true` — existing behaviour, QR/code is accessible
- `earned: false` — card renders with a semi-transparent overlay and a lock icon. Deal text is visible. CTA changes from "Claim" to "Confirm a hangout here to unlock →" which deep-links to the Hangouts Discover tab filtered to that venue's category.

### No other changes to `perks.tsx` in this spec
All other Perks screen work (quick scan card, search, nearby venues section) is out of scope for this spec.

---

## 8. Files Affected

| File | Change |
|---|---|
| `frendli-app/app/(tabs)/hangouts.tsx` | Major — add venue strip, fix My Plans data loading, add sub-toggle, expand category filter, add geolocation |
| `frendli-app/components/VenuePromotionCard.tsx` | New component (strip + feed variants via `displayContext` prop) |
| `frendli-app/components/VenueDetailSheet.tsx` | New component |
| `frendli-app/components/HangoutsSubToggle.tsx` | New component |
| `frendli-app/components/PerkCard.tsx` | Add `earned: boolean` prop, locked state UI |
| `frendli-app/lib/api.ts` | Add `venueApi.getFeatured()`, `hangoutApi.getMy()`, extend `hangoutApi.getDiscovery()` with `suggested`/`thisWeek` params |
| `frendli-api/src/routes/hangouts.ts` | Add `suggested=true` ranking logic, add `activePerksCode` to `/my` response |
| `frendli-api/src/routes/venues.ts` | Add `GET /featured` endpoint |
| `frendli-api/src/routes/perks.ts` (or equivalent) | Add `earned` field to perks response |
| `frendli-api/prisma/schema.prisma` | Add `partnerTier`, `dealText`, `openingHours` fields to `Venue` model |
| `frendli-app/app/(tabs)/perks.tsx` | Pass `earned` prop to `PerkCard` |
