# Discover Page — Full Redesign Spec
**Date:** 2026-03-16
**Project:** RealConnect / Frendli
**Status:** Approved for implementation planning
**Phase:** Phase 1 (Phase 2 additions noted inline)

---

## 1. Overview

The Discover page is the single most important screen in the app. It is the only place users find potential friends, so it must be visually compelling, feel warm and human, and be completely distinct from dating app patterns.

This spec covers a full rebuild of the Discover screen, the Discover Hero Card, the Profile Detail screen upgrade, the Interest Weighting system, the Friendship Rank scale, the "Maybe Next Time" mechanic, and four new CLI development tools.

---

## 2. Goals

- Make the Discover page a visual hero — photos, venue images, rich interest data
- Eliminate all dating-app associations (no swiping, no left/right gestures, no cold dismiss)
- Surface the quality of a match meaningfully through weighted interest compatibility
- Give the app personality through a named Friendship Rank system (no raw numbers)
- Suggest real-world activities and partner venues on every profile card
- Introduce a "Maybe Next Time" mechanic that keeps profiles in circulation rather than discarding them
- Provide CLI tools that speed up development and prevent regressions

---

## 3. Data Model Changes

### 3.1 Profile — interest weights

```prisma
model Profile {
  // existing fields unchanged
  interestWeights  Json?
  // Shape: { "hiking": 8, "coffee": 10, "gaming": 3 }
  // Keys must match values in interests[]
  // Values: integer 1–10
  // null = all interests treated as weight 5 (neutral default)
}
```

### 3.2 Wave.type — add `maybe` value

The existing schema defines `Wave.type` as `String`, not a Prisma enum. This is consistent with the codebase convention — `availability`, `activityPreferences`, and other "enum-like" columns are all plain `String` fields. The `maybe` value is added to this convention: no enum migration is required.

The route validation guard must be updated from:
```typescript
if (!['like', 'pass'].includes(type))
```
to:
```typescript
if (!['like', 'pass', 'maybe'].includes(type))
```

**Rate limit rule (explicit):** `maybe` waves do NOT count toward the free-tier 15-wave weekly quota. The intent of "Maybe Next Time" is exploratory, not commitment-based. Counting it would penalise cautious users and undermine the mechanic. The weekly limit applies to `like` waves only.

### 3.3 Snooze table — new

```prisma
model Snooze {
  id          String   @id @default(uuid())
  userId      String
  targetId    String
  expiresAt   DateTime // set by server: createdAt + 48h
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  target      User     @relation("SnoozedBy", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([userId, targetId])
  @@index([userId, expiresAt])
}
```

**Rules:**
- A snoozed profile is excluded from `recommendations[]` until `expiresAt` has passed
- After expiry the Snooze row is deleted by a cleanup cron job (runs hourly)
- A user may only have one active Snooze per target at a time (unique constraint)
- `expiresAt` is always set server-side — never trusted from the client

### 3.5 Snooze duration constant

The default snooze duration is **48 hours**, defined as a named constant:
```typescript
// src/lib/constants.ts
export const SNOOZE_DURATION_HOURS = 48;
```
`expiresAt` in the atomic transaction is always computed as `new Date(Date.now() + SNOOZE_DURATION_HOURS * 60 * 60 * 1000)`. This constant is the single source of truth — never hardcoded inline.

### 3.6 maybe → like upgrade path

After a snooze expires, a re-queued profile may be acted on again. The original `maybe` Wave row still exists, and `@@unique([senderId, receiverId])` on the Wave model will throw `P2002` if a new Wave is created for the same pair.

**Resolution:** The wave endpoint uses **upsert** for all wave actions, not create:

```typescript
await prisma.wave.upsert({
  where: { senderId_receiverId: { senderId: userId, receiverId } },
  create: { senderId: userId, receiverId, type },
  update: { type, createdAt: new Date() }  // overwrites prior maybe with new type
});
```

This means:
- `maybe` → `like`: Wave row updated to `like`, match check runs, Snooze row for this pair is deleted
- `maybe` → `maybe` (after re-queue): Wave row updated, new Snooze created (upserted)
- `like` → cannot be downgraded (route should reject if an existing `like` wave exists for this pair)

When `type === "maybe"` and a Snooze already exists for this pair, the Snooze is upserted (`expiresAt` reset to now + 48h) — not duplicated.

### 3.7 Updated GET /api/discovery exclusion query logic

The current query excludes all profiles where the user has any Wave record (`senderId === userId`). This must change to support `maybe` re-queuing:

```typescript
// Profiles permanently excluded (like or pass wave exists)
const hardExcluded = await prisma.wave.findMany({
  where: { senderId: userId, type: { in: ['like', 'pass'] } },
  select: { receiverId: true }
});

// Profiles temporarily excluded (maybe wave + unexpired snooze exists)
const softExcluded = await prisma.snooze.findMany({
  where: { userId, expiresAt: { gt: new Date() } },
  select: { targetId: true }
});

const excludedIds = [
  ...hardExcluded.map(w => w.receiverId),
  ...softExcluded.map(s => s.targetId)
];

// Profiles with a maybe wave but no active snooze ARE eligible (re-queued)
```

### 3.4 Phase 2 additions (not in this build)

```prisma
// Location Anchors — habitual area matching
model LocationAnchor {
  id           String   @id @default(cuid())
  userId       String
  type         String   // "transit" | "cafe" | "gym" | "park" | "other"
  label        String   // e.g. "Shinsaibashi Station"
  neighborhood String   // approximate area, not GPS
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Scoring formula in Phase 2 adds a 5th bucket:
`interests(35%) + location(20%) + availability(15%) + style(10%) + anchorOverlap(20%)`

---

## 4. Scoring Algorithm

### 4.1 Phase 1 formula

```
totalScore = interestScore + locationScore + availabilityScore + styleScore

interestScore   = weightedOverlap(userA, userB) × 40
locationScore   = proximityScore(distanceKm) × 30
availabilityScore = overlapRatio(availA, availB) × 20
styleScore      = styleCompatibility(tagsA, tagsB) × 10
```

### 4.2 Weighted interest overlap

```typescript
function weightedOverlap(profileA: Profile, profileB: Profile): number {
  const sharedInterests = profileA.interests.filter(i =>
    profileB.interests.includes(i)
  );

  if (sharedInterests.length === 0) return 0;

  const weightsA = profileA.interestWeights ?? {};
  const weightsB = profileB.interestWeights ?? {};

  const numerator = sharedInterests.reduce((sum, interest) => {
    const wA = weightsA[interest] ?? 5;
    const wB = weightsB[interest] ?? 5;
    return sum + Math.min(wA, wB) / 10;
  }, 0);

  const denominator = sharedInterests.length;
  return numerator / denominator; // 0.0 – 1.0
}
```

**Important:** `weightedOverlap` returns a value in `0.0–1.0`. It is multiplied by 40 to produce the `interestScore` component (0–40). The existing interest scoring logic in `discovery.ts` lines 98–108 is replaced entirely by this function.

**Interpretation:**
- Two users who are both 10/10 on Coffee → contribution: 1.0 (maximum)
- A 9 matched with a 4 on Hiking → contribution: 0.4 (honest compatibility)
- Both weight 3 on Gaming → contribution: 0.3 (weak shared interest, low boost)

**Server-side validation on PATCH /api/profile for interestWeights:**
- If `interests` and `interestWeights` are both present in the same PATCH request, `interests` is validated and saved first; `interestWeights` keys are then validated against the newly saved `interests` array
- If only `interestWeights` is updated (no `interests` in the request body), keys are validated against the profile's existing `interests` array, read from the DB before the write
- Values must be integers in range 1–10 (reject floats, reject out-of-range with 422)
- Unknown keys (not in `interests`) are stripped silently before saving
- The `?? 5` fallback in `weightedOverlap` is a runtime guard for legacy data only, not a substitute for input validation

### 4.3 Hard city filter

Profiles more than `maxDistanceKm` from the requesting user are excluded before scoring. Default: 50km. User-configurable via FilterSheet (no minimum enforced — users may widen it but cross-city matching is opt-in only).

---

## 5. Friendship Rank Scale

Scores are never shown to users. Every pairing maps to a named rank displayed in the coral badge on the card and the rank badge on the Profile Detail screen.

| Emoji | Rank Name | Score Range |
|-------|-----------|-------------|
| 🌫️ | Absolute Strangers | 0–6 |
| 🌱 | Just Sprouting | 7–12 |
| 🚢 | Ships Passing | 13–18 |
| 📡 | Distant Signals | 19–24 |
| 🕯️ | Faint Spark | 25–29 |
| 😊 | Kinda Buds | 30–34 |
| 🤔 | Something There | 35–38 |
| ✨ | A Spark of Something | 39–43 |
| 🌡️ | Getting Warmer | 44–48 |
| 🎯 | Solid Overlap | 49–52 |
| 🔑 | Clicking a Bit | 53–56 |
| 📖 | On the Same Page | 57–60 |
| 🎵 | Same Tune | 61–64 |
| 📻 | Same Wavelength | 65–68 |
| 🤝 | Your Kind of People | 69–72 |
| 🌟 | Mate Material | 73–75 |
| 🕊️ | Kindred Spirits | 76–79 |
| 💪 | Proper Pals | 80–82 |
| 🏆 | Friendship Goals | 83–85 |
| ⚡ | Dynamic Duo | 86–88 |
| 💎 | Rare Find | 89–91 |
| 🚀 | Best Mate Energy | 92–94 |
| 👯 | Practically Twins | 95–96 |
| 🌈 | Super Best Mates | 97–98 |
| 💫 | Friendship Soulmates | 99–100 |

**Implementation note:** A `getRankFromScore(score: number)` utility function in a shared `lib/rank.ts` file handles all mapping. No magic numbers in components.

---

## 6. Discover Screen Layout

### 6.1 Screen structure (top to bottom)

```
DiscoverHeader          ← unchanged (greeting, filter, notifications, SOS)
├── Hero: CardStack     ← new DiscoverHeroCard inside upgraded CardStack
└── ScrollView
    ├── WavesSection    ← unchanged
    ├── HappeningSoonSection  ← unchanged
    └── NextStepsSection      ← hidden once all steps complete
```

### 6.2 DiscoverHeroCard layout

```
┌─────────────────────────────────────┐
│                                     │
│   PHOTO — full-bleed, top 60%       │
│   rounded top corners (24px)        │
│                                     │
│  ┌─ verified badge ── rank badge ─┐ │  ← overlaid on photo, bottom edge
│  │  ✓ Verified   ⚡ Dynamic Duo   │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Info panel — bottom 40%            │
│                                     │
│  Sarah, 28  ·  📍 1.4 km away      │
│                                     │
│  ☕ Coffee   ●●●●●●●●●●  (shared)   │  ← coral dots, shared interests first
│  🥾 Hiking   ●●●●●●●●○○             │  ← coral dots, shared
│  🎲 Board Games ●●●●●●●●●○          │  ← coral dots, shared
│                                     │
│  ─── Do Together ─────────────────  │
│  [ venue photo ] Board game night   │
│  Meeples Café · 0.8 km · ★ Partner  │
│                                     │
│  ┌──────────────┐ ┌───────────────┐ │
│  │ Maybe Next   │ │  Wave 👋      │ │
│  │ Time  🌟     │ │               │ │
│  └──────────────┘ └───────────────┘ │
└─────────────────────────────────────┘
```

**Card interest display rules:**
- Only shared interests shown on the card (max 3)
- Dots represent their passion weight (1–10), shown in coral
- Non-shared interests are not shown on the card (visible in full profile only)
- "Do Together" venue is the highest-scoring partner venue matching shared interests
- If no partner venue matches, fall back to nearest non-partner venue

### 6.3 Card stack visual behaviour

- Max 2 cards visible at once: active card (full opacity) + next card (90% scale, slightly blurred behind)
- Max 15 cards per session load — enforced server-side via `take: 15` in the discovery query (not a client-side slice). This is an intentional session cap, not a data availability limit.
- When all 15 are actioned → H-03 Feed Empty State

### 6.4 H-03 Feed Empty State

Shown when all session cards have been waved or snoozed:

```
     🎉  You've seen everyone nearby today

     New people join every day — check back tomorrow.
     In the meantime, join a group hangout.

         [ Browse Group Hangouts ]    ← routes to /(tabs)/hangouts
```

### 6.5 Button interactions

**Wave 👋 (coral, filled)**
- Records `Wave { type: "like" }` via `POST /api/discovery/wave`
- If mutual → triggers `MatchModal` celebration
- Animation: card lifts upward and floats off screen top with soft warm glow
- Toast: "Wave sent! 👋" in coral, 2s duration

**Maybe Next Time 🌟 (teal tint, teal text)**
- Single call to `POST /api/discovery/wave { type: "maybe" }` — the server atomically creates both the Wave row and the Snooze row inside a `prisma.$transaction([...])`. There is no separate client-side `/snooze` call.
- Profile disappears from feed for 48h, then re-queues automatically
- Animation: card scales down and tucks back into the deck below the next card with a gentle stack bounce
- Toast: "We'll reintroduce you soon ✨" in teal, 2s duration

**Both animations:**
- Duration: 350ms (within project animation token range 150–400ms)
- Must respect `prefers-reduced-motion` — fall back to instant transition with opacity fade
- Uses `react-native-reanimated` v3

---

## 7. Interest Weighting — Settings UI

### 7.1 Edit Interests screen upgrade (OB-05 / P-03)

Selected interests expand to show a weight slider inline:

```
✓ ☕ Coffee
──────────────────────────────
Casual  ○──────────────●  Obsessed
                        10/10

✓ 🥾 Hiking
──────────────────────────────
Casual  ○────────────●──  Obsessed
                     8/10

+ 🎮 Gaming   (tap to add → default weight 5)
```

**Behaviour:**
- Tap unselected interest → adds it with weight 5, slider appears
- Slider: integer steps 1–10, snap-to-step
- Label language: "Casual → Obsessed" (not "1 → 10")
- Deselecting removes interest and its weight from `interestWeights` JSON
- `interestWeights` saved on blur / screen exit via `PATCH /api/profile`

---

## 8. Profile Detail Screen (H-02) Upgrade

### 8.1 Section order

```
1. Photo header (full-bleed, existing)
2. Name · Age · Distance · Verified badge
3. Friendship Rank badge  ← replaces "13% Potential" number
4. Bio / match reason card (existing)
5. Compatibility Breakdown — progress bars (existing, unchanged)
6. ALL INTERESTS — passion meters  ← upgraded
7. DETAILS (Friendship Style, Life Stage, Activity Vibe, Availability)
8. Do Together suggestion card  ← new
9. Action buttons: [Wave 👋]  [Maybe Next Time 🌟]
```

### 8.2 ALL INTERESTS — passion meter display

```
ALL INTERESTS
─────────────────────────────────────────────
☕ Coffee        ●●●●●●●●●●   10    ← shared · coral dots
🥾 Hiking        ●●●●●●●●○○    8    ← shared · coral dots
🎲 Board Games   ●●●●●●●●●○    9    ← shared · coral dots
🎮 Gaming        ●●●●○○○○○○    4    ← not shared · grey dots
🎵 Music         ●●●●●●●○○○    7    ← not shared · grey dots
─────────────────────────────────────────────
✨ You both love: Coffee · Hiking · Board Games
```

**Rules:**
- Coral filled dots = shared interest
- Grey filled dots = their interest (not shared)
- Dot count (1–10) = their passion weight, not the viewer's
- Shared interests always sort to top
- "You both love" summary strip at bottom (only if ≥1 shared interest)

### 8.3 Do Together suggestion card (new)

Displayed just above the action buttons:

```
┌─────────────────────────────────────────────┐
│  [ venue photo - 80px ]                     │
│  Board game night                           │
│  Meeples Café · 0.8 km away                 │
│  ★ Partner venue — 10% off with Wave        │
│                            [ View Venue › ] │
└─────────────────────────────────────────────┘
```

Logic: same as card — highest-scoring partner venue for shared interests. Falls back gracefully if no venue data.

### 8.4 Navigation context — userId requirement

The profile detail screen is navigated to from the `DiscoverHeroCard` using the existing route `/profile/[id]`. The Wave and Maybe Next Time buttons on the profile detail require `receiverId` (the User ID, not the Profile ID) for `POST /api/discovery/wave`.

The `GET /api/profile/:id` response already includes `userId` in the returned payload. The profile detail screen must read `userId` from the fetched profile object to construct wave requests. No route param changes are needed — the profile fetch response is the source of truth.

```typescript
// In profile/[id].tsx — after fetching profile
const handleWave = async (type: 'like' | 'maybe') => {
  await fetch('/api/discovery/wave', {
    method: 'POST',
    body: JSON.stringify({ receiverId: profile.userId, type })
  });
};
```

---

## 9. API Changes

### 9.1 GET /api/discovery — updated response shape

```typescript
{
  recommendations: Array<{
    // existing fields
    id, userId, firstName, age, dob, bio, photos,
    interests, interestWeights,   // ← NEW
    friendshipStyle, availability,
    score, rank,                  // ← rank replaces raw score display
    sharedInterests,
    distanceKm, distance,
    isVerified, isOnline,
    suggestedActivity: {          // ← NEW, computed at query time — null if no venue found
      label: string,              // e.g. "Board game night" — derived from interest category
      reason: string,             // e.g. "You both love board games"
      venueName: string,
      venueId: string,
      venueImageUrl?: string,
      isPartner: boolean,
      distanceKm: number
    } | null
  }>,
  wavesReceived: Wave[],
  happeningSoon: Hangout[],
  streakCount: number,
  matchCount: number,
  upcomingHangoutCount: number
}
```

### 9.1a suggestedActivity generation logic

`suggestedActivity` is computed per recommendation at query time using this rule:

1. Take the highest-weighted shared interest (by `min(weightA, weightB)`)
2. Map that interest to a venue category using the `INTEREST_TO_CATEGORY` lookup table (e.g., `"board games" → "board_games"`, `"coffee" → "cafe"`, `"hiking" → "outdoor"`)
3. Query `Venue` where `category = mappedCategory` and distance ≤ `maxDistanceKm`, ordered by `isPartner DESC, distanceKm ASC`
4. Take the first result — this is the `suggestedActivity` venue
5. Derive `label` from a `CATEGORY_TO_ACTIVITY_LABEL` map (e.g., `"board_games" → "Board game night"`, `"cafe" → "Coffee catch-up"`)
6. If no matching venue exists → `suggestedActivity: null`

The `INTEREST_TO_CATEGORY` and `CATEGORY_TO_ACTIVITY_LABEL` maps are defined as constants in `src/lib/activitySuggestions.ts` and are the single source of truth for this logic.

**Fallback rules (explicit):**
- If the highest-weighted shared interest has no entry in `INTEREST_TO_CATEGORY` → try the next shared interest by weight; if none have a mapping → `suggestedActivity: null`
- If `INTEREST_TO_CATEGORY` lookup returns `undefined` for an interest, that interest is skipped cleanly — no undefined is passed to the Venue query
- If no Venue record exists for the mapped category within `maxDistanceKm` → `suggestedActivity: null`

### 9.2 POST /api/discovery/wave — updated

```typescript
// Request body
{ receiverId: string, type: "like" | "pass" | "maybe" }

// Response (unchanged shape, type field added)
{ matched: boolean, matchId?: string }
```

### 9.3 POST /api/discovery/wave (maybe type) — atomic server behaviour

When `type === "maybe"`, the server executes inside a single Prisma transaction:
1. Creates `Wave { senderId, receiverId, type: "maybe" }`
2. Upserts `Snooze { userId, targetId, expiresAt: now + 48h }`

The `POST /api/discovery/snooze` endpoint described in earlier drafts is removed. All snooze logic is handled server-side within the wave endpoint. The client sends one request regardless of wave type.

### 9.4 GET /api/discovery/snoozes — scoped debug endpoint

Returns active snoozes for the **authenticated user only** (scoped by `req.userId`). Never returns other users' snooze data. This endpoint is protected by `requireAuth` middleware. It is not admin-only but is self-scoped — a user can only see their own snooze list. Used by the `match-scorer` CLI tool to show why a profile is not appearing in recommendations.

```typescript
// HTTP 200 always (empty array when no active snoozes — never null/omitted)
// Sorted by expiresAt ASC (soonest expiry first)
{
  snoozes: Array<{
    targetId: string,          // User ID — for client-side deduplication
    targetFirstName: string,   // Display name only, no PII
    expiresAt: string          // ISO 8601 datetime
  }>
}
```

---

## 10. CLI Tools

All tools located in `.claude/cli/tools/`. All follow the existing JSON I/O contract.

### 10.1 `seed-discovery.sh`

Seeds the database with realistic mock profiles for testing the Discover page.

**Actions:** `seed` · `clear` · `list` · `seed-waves`

**Key params for `seed`:**
```json
{
  "action": "seed",
  "params": {
    "count": 20,
    "city": "Osaka",
    "lat": 34.6937,
    "lng": 135.5023,
    "radiusKm": 5,
    "clearExisting": false
  }
}
```

**Output includes** rank distribution so you can verify the scoring algorithm is producing a realistic spread.

### 10.2 `match-scorer.sh`

Tests the weighted matching algorithm between two user IDs, returning full score breakdown and the Friendship Rank.

**Actions:** `score` · `score-bulk` · `rank-name`

**`score-bulk`** runs one user against the entire active pool and returns ranked results — used for algorithm tuning.

### 10.3 `api-health.sh`

Hits every RealConnect API endpoint and validates status codes, response shapes, and response times. Run before every deploy and after backend changes.

**Actions:** `check-all` · `check-route` · `check-discovery` · `check-safety`

**Exit codes:** 0 = all green, 1 = warnings, 2 = failures (suitable for CI/CD pipelines).

### 10.4 `screen-audit.sh`

Parses `SCREEN-INVENTORY.md` and cross-references every screen ID against the actual file tree. Outputs a gap report.

**Actions:** `audit` · `audit-flow` · `summary`

**`audit-flow`** param `"flow": "H"` audits only the Discover flow — useful for focused sprint work.

---

## 11. Phase 2 — Location Anchors (not in this build)

Location Anchors allow users to declare 1–3 habitual locations (transit stops, regular cafés, gyms, parks) as named places — not GPS coordinates. The matching algorithm gains a 5th scoring bucket: `anchorOverlap(20%)`.

**Key design principle:** proximity to where people *actually spend time* — not just where they sleep — is the single strongest predictor of whether two people will follow through on meeting. Two people who both pass through the same station or neighbourhood have a natural, convenient meeting point that removes all friction from the first hangout.

**Privacy:** No GPS stored. Anchors are user-declared named places only. Approximate neighbourhood stored, not address.

Full spec to be written as a separate document when Phase 1 ships.

---

## 12. Out of Scope (this spec)

- Match Alike (AI style photo analysis) — existing feature, unchanged
- SafeArrival / Silent SOS — unchanged
- Chat / Messaging — unchanged
- Perks / Coupons — unchanged
- Venue Partner Portal — separate product

---

## 13. Testing Requirements

Per project rules:

| Layer | Requirement |
|-------|-------------|
| `getRankFromScore()` | 100% branch coverage — every tier boundary tested |
| `weightedOverlap()` | Unit tests for null weights, zero shared, all-10 scenario |
| `POST /api/discovery/snooze` | Happy path + expired snooze re-queue + duplicate snooze |
| `POST /api/discovery/wave` (maybe type) | Creates Snooze row, does not create Wave row of type "like" |
| `DiscoverHeroCard` | Renders correctly with 0, 1, and 3 shared interests |
| Animation | Reduced-motion fallback tested on both iOS and Android |
| Seed tool | `seed` + `clear` + `list` actions all return valid JSON |
| Match scorer | `score` output matches manual calculation for known test pair |

---

## 14. Summary of All Changes

| Area | Change |
|------|--------|
| Prisma schema | `interestWeights` on Profile; `maybe` WaveType; new Snooze table |
| Scoring algorithm | Weighted interest overlap replaces simple count |
| Discovery API | Updated response shape, new `/snooze` endpoint, `maybe` wave type |
| Discover screen | Hero CardStack with DiscoverHeroCard; H-03 empty state |
| Card interaction | Buttons only — Wave (coral) and Maybe Next Time (teal); no swipe |
| Card animation | Wave floats up; Maybe tucks back into deck — both warm, both positive |
| Friendship Rank | 25 named tiers, no numbers shown to users |
| Profile Detail | Passion meter dots per interest; Do Together card; rank badge |
| Edit Interests | Weight slider per interest (Casual → Obsessed) |
| CLI tools | seed-discovery, match-scorer, api-health, screen-audit |
| Phase 2 (later) | Location Anchors, habitual area matching, updated scoring formula |
