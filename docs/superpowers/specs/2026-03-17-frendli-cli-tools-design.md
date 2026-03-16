# Frendli CLI Tools & Project Config — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** 4 Frendli-specific CLI tools + update 3 governance/config files

---

## Overview

The Frendli monorepo (`frendli-api` + `frendli-app`) needs 4 developer CLI tools tailored to daily dev workflow pain points, plus updates to the 3 governance files that currently contain generic template content instead of Frendli-specific information.

All 4 tools follow the existing JSON I/O contract established by the template CLI framework (`source lib/utils.sh`, stdin JSON input, `success_response` / `error_response` helpers). Tools live in `.claude/cli/tools/`.

---

## Part 1: CLI Tools

### Tool 1: `frendli-api.sh` — API Testing

**Location:** `.claude/cli/tools/frendli-api.sh`

**Purpose:** Hit any Frendli API route with correct auth headers, without needing Postman or a running mobile app.

**Actions:**

| Action | Description |
|--------|-------------|
| `get` | GET a route |
| `post` | POST with JSON body |
| `patch` | PATCH with JSON body |
| `delete` | DELETE a resource |
| `list` | Print all known Frendli routes |

**Parameters:**

```json
{
  "action": "get",
  "params": {
    "route": "/api/hangouts/my",
    "mock_user_id": "user-uuid-here",
    "token": "optional-firebase-jwt",
    "body": {},
    "base_url": "http://localhost:3000"
  }
}
```

**Auth logic:**
- If `token` is provided → send `Authorization: Bearer <token>`
- Otherwise → send `x-mock-user-id: <mock_user_id>` (supports the current mock mode)
- `mock_user_id` defaults to the first seeded test user UUID if not specified
- `base_url` defaults to `$FRENDLI_API_URL` env var, then `http://localhost:3000`

**Output:** JSON response body + HTTP status code + latency in ms

**Known routes list** (for `list` action):
```
GET    /api/profile/me
GET    /api/hangouts/my
POST   /api/hangouts
GET    /api/hangouts/:id
POST   /api/hangouts/:id/join
GET    /api/discovery
POST   /api/waves
GET    /api/matches
GET    /api/venues
GET    /api/groups
POST   /api/groups
GET    /api/interests
GET    /api/friends
GET    /api/perks
GET    /api/subscriptions
GET    /api/safety
GET    /api/leads
POST   /api/webhooks
```

> The `list` action output should be treated as a reference/starting point. The source of truth is the 13 route files in `frendli-api/src/routes/`. Consider making `list` parse the route files dynamically in a future iteration.

---

### Tool 2: `db-inspect.sh` — Database State Inspector

**Location:** `.claude/cli/tools/db-inspect.sh`

**Purpose:** Query the local PostgreSQL DB (Docker) without needing the API running. No ORM — raw SQL via `npx prisma db execute`.

**Actions:**

| Action | Description |
|--------|-------------|
| `stats` | Row counts for all major tables |
| `users` | List recent users with profile summary |
| `hangouts` | List upcoming/recent hangouts with attendee counts |
| `matches` | List recent matches |
| `user` | Full profile for one user by ID |
| `venue` | Venue details + its hangouts |
| `waves` | Recent wave activity |

**Parameters:**

```json
{
  "action": "stats",
  "params": {
    "limit": 20,
    "id": "optional-uuid-for-user/venue-actions",
    "format": "table"
  }
}
```

**Implementation:** Each action runs a SQL query via the Docker PostgreSQL container directly:
```bash
docker exec frendli-db psql -U postgres -d frendli -t -A -F'|' -c "SELECT ..."
```
The container name `frendli-db` and credentials are read from `frendli-api/.env` (`DATABASE_URL`). As a fallback for non-Docker setups, use `npx tsx` with a small inline script that imports `@prisma/client` and queries via Prisma Client (not `prisma db execute`, which is DDL-only and does not return rows).

**Output:** Formatted table by default using `column -t` (available in Git Bash on Windows via util-linux). If `column -t` is not available, fall back to fixed-width printf formatting. If `"format": "json"` is passed, outputs raw JSON suitable for piping into `json-processor.sh`.

**Tables covered:** `User`, `Profile`, `Hangout`, `HangoutAttendee`, `Match`, `Wave`, `Venue`, `Group`, `Message`

---

### Tool 3: `typecheck.sh` — TypeScript Checker

**Location:** `.claude/cli/tools/typecheck.sh`

**Purpose:** Run `tsc --noEmit` across both packages with clean, scannable output.

**Actions:**

| Action | Description |
|--------|-------------|
| `both` | Check `frendli-api` and `frendli-app` in parallel (default) |
| `api` | Check `frendli-api` only |
| `app` | Check `frendli-app` only |
| `watch` | Watch mode for a single package (terminal escape hatch — bypasses JSON response wrapper, streams directly to stdout, never exits) |

**Parameters:**

```json
{
  "action": "both",
  "params": {
    "package": "api",
    "verbose": false
  }
}
```

> **Note on `watch`:** The `watch` action is intentionally incompatible with the JSON I/O contract. It bypasses `success_response`/`error_response` and streams `tsc --watch` directly to the terminal. It is intended for human use only — never invoke `watch` from an agent. The `package` param is required for `watch` (must be `"api"` or `"app"`).

**Output format:**
```
╔══════════════════════════════╗
║  frendli-api    ❌ 3 errors  ║
║  frendli-app    ✅ 0 errors  ║
╚══════════════════════════════╝

frendli-api errors:
  src/routes/hangouts.ts:42  — Type 'string' not assignable to 'number'
  src/services/match.ts:17   — Property 'userId' does not exist
  src/index.ts:8             — Cannot find module './middleware/auth'
```

**Filtering:** Strips `node_modules` errors automatically. Shows relative paths only (no absolute paths).

All tools require `jq` transitively via `utils.sh`. `typecheck.sh` itself uses no additional jq beyond the framework wrapper.

---

### Tool 4: `prisma-ops.sh` — Prisma Database Operations

**Location:** `.claude/cli/tools/prisma-ops.sh`

**Purpose:** All Prisma operations + seed management in one place.

**Actions:**

| Action | Description |
|--------|-------------|
| `migrate` | `prisma migrate dev` with optional name |
| `generate` | `prisma generate` (regenerate client) |
| `push` | `prisma db push` (quick schema sync, no migration file) |
| `reset` | Drop + recreate + re-run migrations + seed (confirmation required) |
| `seed` | Run seed script only |
| `studio` | Launch Prisma Studio |
| `status` | Show migration status |

**Parameters:**

```json
{
  "action": "migrate",
  "params": {
    "name": "add_venue_capacity_field",
    "skip_seed": false,
    "confirm": false
  }
}
```

**Reset safety:** The `reset` action requires `"confirm": true` in params. Without it, the tool always returns `error_response` with code `CONFIRMATION_REQUIRED` — no interactive prompt is attempted (this tool must remain agent-safe). Interactive confirmation is explicitly out of scope.

**Seed data created by `seed` action:**

The seed script (`frendli-api/prisma/seed.ts`) will be updated to create:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 5 | With verified phones, full profiles, interests, locations in NYC area |
| Venues | 3 | Café (Brooklyn), Park (Central Park), Bar (LES) |
| Hangouts | 3 | One per venue, 2–3 attendees each, upcoming dates |
| Waves | 4 | Between test users (some mutual, some one-way) |
| Matches | 2 | From mutual waves, one with a message thread |

**Existing seed.ts must be fully replaced** (not extended). The current seed creates 4 users with non-UUID IDs (`mock-user-id`, `alice-id`, `bob-id`, `charlie-id`). The new seed uses real UUID format for all IDs to match the schema's `@id @default(uuid())` and be compatible with Firebase auth downstream.

**Deterministic test user UUIDs:**

| User | UUID |
|------|------|
| Dev (default mock) | `00000000-0000-0000-0000-000000000001` |
| Alice | `00000000-0000-0000-0000-000000000002` |
| Bob | `00000000-0000-0000-0000-000000000003` |
| Charlie | `00000000-0000-0000-0000-000000000004` |
| Dana | `00000000-0000-0000-0000-000000000005` |

`frendli-api.sh` defaults `mock_user_id` to `00000000-0000-0000-0000-000000000001`.

**Wave pairs and matches:**
- Dev → Alice (wave)
- Alice → Dev (wave) → creates **Match 1** (no messages)
- Bob → Charlie (wave)
- Charlie → Bob (wave) → creates **Match 2** (with one message thread: "Hey, want to join the coffee hangout?")
- Dana → Dev (wave, one-way — no match)

Test user IDs will be deterministic UUIDs (hardcoded, not random) so `frendli-api.sh` can default to a known mock user without configuration.

**All operations run from `frendli-api/` directory automatically.**

---

## Part 2: Governance File Updates

> **Important:** Read each of these 3 files before rewriting them. The `00-orchestrator.md` boot protocol references `ANTIGRAVITY.md` on startup — preserve the section headings and key structural conventions it expects.

### File 1: `README.md`

Replace the generic template README with a Frendli project README covering:
- What Frendli is (social connection mobile app — React Native/Expo + Node/Express API)
- Monorepo structure (`frendli-api`, `frendli-app`)
- Tech stack: Expo/React Native, Express 5, Prisma 6, PostgreSQL (Docker), Firebase Auth, Supabase, Socket.io, NativeWind
- Local dev setup: Docker for DB, `npm run dev` in API, Expo Go for app
- The 4 new CLI tools and how to use them
- Current auth status (mock mode, Supabase keys not yet configured)
- Links to specs in `docs/superpowers/`

### File 2: `ANTIGRAVITY.md`

Replace template content with Frendli-specific project integration map:
- Project purpose: mobile app for real-world social connections/meetups
- Actual directory structure (`frendli-api/`, `frendli-app/`, `docs/`, `.claude/cli/tools/`)
- Core capabilities mapped to CLI tools (API testing → `frendli-api.sh`, etc.)
- Integration points: Docker/PostgreSQL, Firebase Auth, Supabase, Expo
- Current status: mock auth mode active, Prisma schema complete, 13 route files

### File 3: `Global_Manifest.md`

Replace template content with live Frendli state:
- Active packages and their status
- Current route inventory (13 route files)
- Known issues: Supabase keys not set (mock mode), TypeScript errors in `frendli-app`
- The 4 CLI tools as active project tools
- Tech stack versions from `package.json`

---

## Architecture Notes

**Tool placement:** All 4 tools go in `.claude/cli/tools/` alongside the existing 6 template tools, following the exact same pattern (`source lib/utils.sh`, JSON stdin, `success_response`/`error_response`).

**No new dependencies** beyond what's already in the project. All tools source `utils.sh`, which requires `jq` — so `jq` is a transitive dependency for all 4 tools via the framework.

- `frendli-api.sh` — `curl` + `jq` (via utils.sh). Uses `-w "\n%{http_code}\n%{time_total}"` with `-o` to capture status + latency separately from body.
- `db-inspect.sh` — `docker exec` to run psql queries against the local container; `npx tsx` as fallback; `column -t` or printf fallback for table rendering on Windows/Git Bash
- `typecheck.sh` — `tsc` only; `**No extra jq usage**` beyond the framework's utils.sh (note: the `watch` action streams directly and does not invoke `success_response`)
- `prisma-ops.sh` — `npx prisma` (already installed in `frendli-api/`)

**Orchestrator update:** `.agent-rules/00-orchestrator.md` CLI tool list should be updated to include the 4 new tools so agents know they exist.

---

## Success Criteria

1. `frendli-api.sh` can hit `/api/hangouts/my` in mock mode using default `mock_user_id` `00000000-0000-0000-0000-000000000001` and return a formatted JSON response with status code and latency
2. `db-inspect.sh stats` returns row counts for all major tables without the API running (uses Docker psql)
3. `typecheck.sh both` runs tsc on both packages in parallel and shows a clean summary with error count per package
4. `prisma-ops.sh seed` populates 5 users, 3 venues, 3 hangouts, 4 waves, 2 matches using deterministic UUIDs; fully replaces the existing `seed.ts`
5. `prisma-ops.sh reset` returns `CONFIRMATION_REQUIRED` error unless `"confirm": true` is explicitly passed — no interactive prompt
6. `README.md`, `ANTIGRAVITY.md`, `Global_Manifest.md` describe Frendli (not the template); existing files are read before rewriting to preserve any structural conventions referenced by `00-orchestrator.md`
7. All 4 new tools are listed in `.agent-rules/00-orchestrator.md` CLI tool inventory
