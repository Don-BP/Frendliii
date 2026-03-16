# Frendli CLI Tools Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 Frendli-specific developer CLI tools (`prisma-ops.sh`, `db-inspect.sh`, `frendli-api.sh`, `typecheck.sh`) and update 3 governance files (`README.md`, `ANTIGRAVITY.md`, `Global_Manifest.md`) plus `00-orchestrator.md`.

**Architecture:** Each tool follows the existing CLI framework pattern: `source lib/utils.sh`, reads JSON from stdin, emits `success_response`/`error_response`. Tools live in `.claude/cli/tools/`. The seed.ts is fully replaced with deterministic-UUID test data.

**Tech Stack:** Bash 4+, jq, curl, TypeScript (tsc), Prisma 6, Docker/psql, Node/tsx, Express 5, Prisma Client

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.claude/cli/tools/prisma-ops.sh` | Create | Prisma migrate/generate/push/reset/seed/studio/status |
| `.claude/cli/tools/db-inspect.sh` | Create | SQL queries against Docker PostgreSQL |
| `.claude/cli/tools/frendli-api.sh` | Create | HTTP API testing with mock auth |
| `.claude/cli/tools/typecheck.sh` | Create | tsc --noEmit across both packages |
| `frendli-api/prisma/seed.ts` | Replace | Deterministic UUID seed data |
| `README.md` | Replace | Frendli project README |
| `ANTIGRAVITY.md` | Replace | Frendli project integration map |
| `Global_Manifest.md` | Replace | Live Frendli project state |
| `.agent-rules/00-orchestrator.md` | Modify | Add 4 new tools to CLI inventory |

---

## Environment Facts (read before implementing)

- `DATABASE_URL`: `postgresql://postgres:password@localhost:5432/frendlidb?schema=public`
- Docker container name: **discover at runtime** with `docker ps --format '{{.Names}}' | grep -iE "postgres|frendli|db" | head -1`
- API base URL: `http://localhost:3000` (default), overridable via `$FRENDLI_API_URL` env var
- Default mock user ID: `00000000-0000-0000-0000-000000000001`
- Both packages use TypeScript: `frendli-api/tsconfig.json`, `frendli-app/tsconfig.json`
- All tools run from the **repo root** (`e:/Frendli/`) but cd into sub-packages as needed

---

## Chunk 1: `prisma-ops.sh` + Updated `seed.ts`

### Task 1: Replace `seed.ts` with deterministic UUID data

**Files:**
- Replace: `frendli-api/prisma/seed.ts`

- [ ] **Step 1: Read existing seed.ts** to understand current cleanup order (foreign key dependencies must be preserved)

- [ ] **Step 2: Write the new seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic test user IDs
const IDS = {
  dev:     '00000000-0000-0000-0000-000000000001',
  alice:   '00000000-0000-0000-0000-000000000002',
  bob:     '00000000-0000-0000-0000-000000000003',
  charlie: '00000000-0000-0000-0000-000000000004',
  dana:    '00000000-0000-0000-0000-000000000005',
};

async function main() {
  console.log('Seeding Frendli test data...');

  // Cleanup in FK-safe order
  await prisma.message.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.wave.deleteMany({});
  await prisma.hangoutFeedback.deleteMany({});
  await prisma.hangoutAttendee.deleteMany({});
  await prisma.hangoutJoinRequest.deleteMany({});
  await prisma.hangout.deleteMany({});
  await prisma.recurringPattern.deleteMany({});
  await prisma.perk.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.emergencyContact.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  // Users with full profiles
  const users = [
    {
      id: IDS.dev,
      phoneNumber: '+15551234567',
      profile: {
        firstName: 'Dev',
        bio: 'Default dev user for testing.',
        interests: ['coffee', 'tech', 'board-games', 'hiking'],
        friendshipStyle: 'one-on-one',
        latitude: 40.7128, longitude: -74.0060,
      },
    },
    {
      id: IDS.alice,
      phoneNumber: '+15550001001',
      profile: {
        firstName: 'Alice',
        bio: 'Avid hiker and coffee lover.',
        interests: ['hiking', 'coffee', 'photography'],
        friendshipStyle: 'one-on-one',
        latitude: 40.7150, longitude: -74.0080,
      },
    },
    {
      id: IDS.bob,
      phoneNumber: '+15550001002',
      profile: {
        firstName: 'Bob',
        bio: 'Tech enthusiast and board game geek.',
        interests: ['tech', 'board-games', 'video-games'],
        friendshipStyle: 'small-group',
        latitude: 40.7200, longitude: -74.0100,
      },
    },
    {
      id: IDS.charlie,
      phoneNumber: '+15550001003',
      profile: {
        firstName: 'Charlie',
        bio: 'Guitarist looking for a jam buddy.',
        interests: ['concerts', 'piano', 'vinyl'],
        friendshipStyle: 'one-on-one',
        latitude: 40.7100, longitude: -74.0020,
      },
    },
    {
      id: IDS.dana,
      phoneNumber: '+15550001004',
      profile: {
        firstName: 'Dana',
        bio: 'Foodie and amateur chef.',
        interests: ['cooking', 'restaurants', 'wine'],
        friendshipStyle: 'small-group',
        latitude: 40.7050, longitude: -74.0150,
      },
    },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        phoneNumber: u.phoneNumber,
        isVerified: true,
        profile: { create: { ...u.profile, safetyBriefingCompleted: true } },
      },
    });
  }

  // Venues
  const cafe = await prisma.venue.create({
    data: {
      name: 'Stumptown Coffee',
      description: 'Specialty coffee in Brooklyn.',
      address: '18 W 29th St, Brooklyn, NY',
      latitude: 40.7450, longitude: -73.9880,
      category: 'cafe',
    },
  });

  const park = await prisma.venue.create({
    data: {
      name: 'Central Park — Sheep Meadow',
      description: 'Open lawn in Central Park.',
      address: 'Central Park, New York, NY',
      latitude: 40.7706, longitude: -73.9812,
      category: 'park',
    },
  });

  const bar = await prisma.venue.create({
    data: {
      name: 'The Metrograph Commissary',
      description: 'Artsy bar on the Lower East Side.',
      address: '7 Ludlow St, New York, NY',
      latitude: 40.7152, longitude: -73.9917,
      category: 'bar',
    },
  });

  // Hangouts
  const inThreeDays = (h = 19) => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(h, 0, 0, 0);
    return d;
  };

  await prisma.hangout.create({
    data: {
      title: 'Morning Coffee Run',
      description: 'Casual coffee and chat.',
      startTime: inThreeDays(9),
      venueId: cafe.id,
      maxAttendees: 4,
      category: 'coffee',
      isPublic: true,
      creatorId: IDS.dev,
      attendees: {
        create: [{ userId: IDS.dev }, { userId: IDS.alice }],
      },
    },
  });

  await prisma.hangout.create({
    data: {
      title: 'Picnic in the Park',
      description: 'Bring snacks, good vibes only.',
      startTime: inThreeDays(14),
      venueId: park.id,
      maxAttendees: 10,
      category: 'outdoor',
      isPublic: true,
      creatorId: IDS.bob,
      attendees: {
        create: [{ userId: IDS.bob }, { userId: IDS.charlie }, { userId: IDS.dana }],
      },
    },
  });

  await prisma.hangout.create({
    data: {
      title: 'LES Bar Crawl',
      description: 'Exploring bars on the Lower East Side.',
      startTime: inThreeDays(21),
      venueId: bar.id,
      maxAttendees: 6,
      category: 'drinks',
      isPublic: true,
      creatorId: IDS.alice,
      attendees: {
        create: [{ userId: IDS.alice }, { userId: IDS.dev }],
      },
    },
  });

  // Waves: Dev→Alice, Alice→Dev (mutual = Match 1), Bob→Charlie, Charlie→Bob (mutual = Match 2), Dana→Dev (one-way)
  await prisma.wave.create({ data: { senderId: IDS.dev, receiverId: IDS.alice, type: 'like' } });
  await prisma.wave.create({ data: { senderId: IDS.alice, receiverId: IDS.dev, type: 'like' } });
  await prisma.wave.create({ data: { senderId: IDS.bob, receiverId: IDS.charlie, type: 'like' } });
  await prisma.wave.create({ data: { senderId: IDS.charlie, receiverId: IDS.bob, type: 'like' } });
  await prisma.wave.create({ data: { senderId: IDS.dana, receiverId: IDS.dev, type: 'like' } });

  // Matches from mutual waves
  await prisma.match.create({ data: { user1Id: IDS.dev, user2Id: IDS.alice } });

  const match2 = await prisma.match.create({ data: { user1Id: IDS.bob, user2Id: IDS.charlie } });

  // One message thread on Match 2
  await prisma.message.create({
    data: {
      matchId: match2.id,
      senderId: IDS.bob,
      content: 'Hey, want to join the picnic hangout this weekend?',
    },
  });

  console.log('Seed complete. Test user IDs:');
  Object.entries(IDS).forEach(([name, id]) => console.log(`  ${name}: ${id}`));
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run the seed to verify it works**

```bash
cd frendli-api && npx prisma db seed
```

Expected output:
```
Seeding Frendli test data...
Seed complete. Test user IDs:
  dev: 00000000-0000-0000-0000-000000000001
  alice: 00000000-0000-0000-0000-000000000002
  ...
```

If it fails with FK errors, check that all `deleteMany` calls are in the right order above.

- [ ] **Step 4: Commit**

```bash
git add frendli-api/prisma/seed.ts
git commit -m "feat: replace seed.ts with deterministic UUID test data (5 users, 3 venues, 3 hangouts, 4 waves, 2 matches)"
```

---

### Task 2: Create `prisma-ops.sh`

**Files:**
- Create: `.claude/cli/tools/prisma-ops.sh`

- [ ] **Step 1: Write the tool**

```bash
#!/bin/bash
# Frendli Prisma Operations Tool
# Actions: migrate, generate, push, reset, seed, studio, status, list

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="prisma-ops"
SUPPORTED_ACTIONS=("migrate" "generate" "push" "reset" "seed" "studio" "status" "list")

# Repo root is 3 levels up from tools/
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
API_DIR="$REPO_ROOT/frendli-api"

run_prisma() {
    # Use an array to avoid eval + word-splitting on user-supplied values (e.g. migration names with spaces)
    local -a prisma_cmd=("npx" "prisma")
    # Append each word from the first argument as separate array elements
    read -ra extra_args <<< "$1"
    prisma_cmd+=("${extra_args[@]}")
    shift  # remaining positional args are appended verbatim
    prisma_cmd+=("$@")

    local output
    if ! output=$(cd "$API_DIR" && "${prisma_cmd[@]}" 2>&1); then
        error_response "Prisma command failed: $output" "PRISMA_ERROR" "$(jq -n --arg o "$output" '{output:$o}')"
        return 1
    fi
    echo "$output"
}

action_migrate() {
    local params="$1"
    local name
    name=$(json_get "$params" ".name")

    local cmd="migrate dev"
    log_info "Running: prisma $cmd${name:+ --name $name}"
    local output
    if [[ -n "$name" ]]; then
        output=$(run_prisma "$cmd" "--name" "$name") || return 1
    else
        output=$(run_prisma "$cmd") || return 1
    fi
    success_response "$(jq -n --arg o "$output" '{output:$o}')"
}

action_generate() {
    log_info "Running: prisma generate"
    local output
    output=$(run_prisma "generate") || return 1
    success_response "$(jq -n --arg o "$output" '{output:$o}')"
}

action_push() {
    log_info "Running: prisma db push"
    local output
    output=$(run_prisma "db push") || return 1
    success_response "$(jq -n --arg o "$output" '{output:$o}')"
}

action_reset() {
    local params="$1"
    local confirm
    confirm=$(json_get "$params" ".confirm")

    if [[ "$confirm" != "true" ]]; then
        error_response \
            "Reset will destroy all data. Pass {\"confirm\": true} to proceed." \
            "CONFIRMATION_REQUIRED" \
            "{}"
        return 1
    fi

    log_warn "Resetting database — all data will be lost"
    local output
    output=$(run_prisma "migrate reset --force") || return 1
    success_response "$(jq -n --arg o "$output" '{output:$o, reset:true}')"
}

action_seed() {
    log_info "Running seed script"
    local output
    output=$(run_prisma "db seed") || return 1
    success_response "$(jq -n --arg o "$output" '{output:$o}')"
}

action_studio() {
    log_info "Launching Prisma Studio (opens browser)"
    cd "$API_DIR" && npx prisma studio
    # studio is interactive — does not return a JSON response
}
# NOTE: studio is a human-only action — agents must never invoke it.
# It opens an interactive browser UI and does not return a JSON response.
# (Same restriction as the watch action in typecheck.sh.)

action_status() {
    log_info "Checking migration status"
    local output
    output=$(run_prisma "migrate status") || return 1
    success_response "$(jq -n --arg o "$output" '{output:$o}')"
}

action_list() {
    local actions_json
    actions_json=$(printf '%s\n' "${SUPPORTED_ACTIONS[@]}" | jq -R . | jq -s .)
    success_response "$actions_json"
}

main() {
    local input=""
    read -t 10 -r input || input=""
    [[ -z "$input" ]] && input="{}"

    if ! parse_request "$input"; then
        error_response "Invalid request format" "PARSE_ERROR"
        return 1
    fi

    local action params
    action=$(json_get "$input" ".action")
    params=$(echo "$input" | jq -c '.params // {}')

    if ! require_action "$action" "${SUPPORTED_ACTIONS[@]}"; then
        error_response "Unsupported action: $action" "UNSUPPORTED_ACTION"
        return 1
    fi

    case "$action" in
        "migrate")  action_migrate "$params" ;;
        "generate") action_generate ;;
        "push")     action_push ;;
        "reset")    action_reset "$params" ;;
        "seed")     action_seed ;;
        "studio")   action_studio ;;
        "status")   action_status ;;
        "list")     action_list ;;
        *)          error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

- [ ] **Step 2: Make executable**

```bash
chmod +x .claude/cli/tools/prisma-ops.sh
```

- [ ] **Step 3: Smoke test — list**

```bash
echo '{"action":"list","params":{}}' | ./.claude/cli/tools/prisma-ops.sh
```

Expected: JSON with `success: true` and array of action names.

- [ ] **Step 4: Smoke test — status**

```bash
echo '{"action":"status","params":{}}' | ./.claude/cli/tools/prisma-ops.sh
```

Expected: `success: true` with Prisma migration status output.

- [ ] **Step 5: Smoke test — reset blocked without confirm**

```bash
echo '{"action":"reset","params":{}}' | ./.claude/cli/tools/prisma-ops.sh
```

Expected: `success: false`, `error.code: "CONFIRMATION_REQUIRED"`.

- [ ] **Step 6: Smoke test — seed**

```bash
echo '{"action":"seed","params":{}}' | ./.claude/cli/tools/prisma-ops.sh
```

Expected: `success: true` with seed output.

- [ ] **Step 7: Commit**

```bash
git add .claude/cli/tools/prisma-ops.sh
git commit -m "feat: add prisma-ops.sh CLI tool (migrate/generate/push/reset/seed/studio/status)"
```

---

## Chunk 2: `db-inspect.sh`

### Task 3: Create `db-inspect.sh`

**Files:**
- Create: `.claude/cli/tools/db-inspect.sh`

**Key facts:**
- DB connection: `postgres:password@localhost:5432/frendlidb`
- Parse these from `frendli-api/.env` at runtime (don't hardcode)
- Find Docker container name dynamically: `docker ps --format '{{.Names}}' | grep -iE "postgres|frendli|db" | head -1`
- Postgres table names are **quoted** (`"User"`, `"Profile"`, etc.) because Prisma uses PascalCase
- Use `PGPASSWORD` env var so psql doesn't prompt for password

- [ ] **Step 1: Write the tool**

```bash
#!/bin/bash
# Frendli Database Inspector
# Query local PostgreSQL DB state without the API running

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="db-inspect"
SUPPORTED_ACTIONS=("stats" "users" "hangouts" "matches" "waves" "user" "venue" "list")

REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
ENV_FILE="$REPO_ROOT/frendli-api/.env"

# ============================================================
# DB CONNECTION
# ============================================================

parse_env_var() {
    local var="$1"
    grep "^${var}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

get_db_params() {
    local url
    url=$(parse_env_var "DATABASE_URL")
    [[ -z "$url" ]] && url="${DATABASE_URL:-}"
    if [[ -z "$url" ]]; then
        echo "ERROR: DATABASE_URL not found"
        return 1
    fi

    # postgresql://user:password@host:port/dbname?schema=public
    DB_USER=$(echo "$url" | sed 's|postgresql://||' | cut -d':' -f1)
    DB_PASS=$(echo "$url" | sed 's|postgresql://[^:]*:||' | cut -d'@' -f1)
    DB_HOST=$(echo "$url" | cut -d'@' -f2 | cut -d':' -f1)
    DB_PORT=$(echo "$url" | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
    DB_NAME=$(echo "$url" | cut -d'/' -f4 | cut -d'?' -f1)
}

find_docker_container() {
    docker ps --format '{{.Names}}' 2>/dev/null | grep -iE "postgres|frendli|db" | head -1 || echo ""
}

run_sql() {
    local sql="$1"
    get_db_params || return 1

    local container
    container=$(find_docker_container)

    local result
    if [[ -n "$container" ]]; then
        result=$(docker exec -e PGPASSWORD="$DB_PASS" "$container" \
            psql -U "$DB_USER" -d "$DB_NAME" -t -A -F'|' -c "$sql" 2>&1) || {
            error_response "SQL query failed: $result" "SQL_ERROR"
            return 1
        }
    else
        # Fallback: direct psql
        if ! command -v psql &>/dev/null; then
            error_response "No Docker container found and psql not installed. Start the DB with Docker." "DB_NOT_FOUND"
            return 1
        fi
        result=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -t -A -F'|' -c "$sql" 2>&1) || {
            error_response "SQL query failed: $result" "SQL_ERROR"
            return 1
        }
    fi
    echo "$result"
}

print_table() {
    local header="$1"
    local data="$2"
    if command -v column &>/dev/null; then
        { echo "$header"; echo "$data"; } | column -t -s '|'
    else
        printf '%s\n' "$header"
        printf '%s\n' "$data"
    fi
}

rows_to_json() {
    local keys=("$@")
    # Read piped rows and convert to JSON objects
    local rows=()
    while IFS='|' read -ra fields; do
        local obj="{"
        for i in "${!keys[@]}"; do
            [[ $i -gt 0 ]] && obj+=","
            obj+="\"${keys[$i]}\":\"${fields[$i]:-}\""
        done
        obj+="}"
        rows+=("$obj")
    done
    printf '%s\n' "${rows[@]}" | jq -s .
}

# ============================================================
# ACTIONS
# ============================================================

action_stats() {
    local params="$1"
    local format
    format=$(json_get "$params" ".format")

    local sql='SELECT '\''Users'\'' as entity, COUNT(*)::text as count FROM "User"
    UNION ALL SELECT '\''Profiles'\'', COUNT(*)::text FROM "Profile"
    UNION ALL SELECT '\''Hangouts'\'', COUNT(*)::text FROM "Hangout"
    UNION ALL SELECT '\''Attendees'\'', COUNT(*)::text FROM "HangoutAttendee"
    UNION ALL SELECT '\''Waves'\'', COUNT(*)::text FROM "Wave"
    UNION ALL SELECT '\''Matches'\'', COUNT(*)::text FROM "Match"
    UNION ALL SELECT '\''Messages'\'', COUNT(*)::text FROM "Message"
    UNION ALL SELECT '\''Venues'\'', COUNT(*)::text FROM "Venue"
    UNION ALL SELECT '\''Groups'\'', COUNT(*)::text FROM "Group"
    ORDER BY entity;'

    local result
    result=$(run_sql "$sql") || return 1

    local json_data
    json_data=$(echo "$result" | rows_to_json "entity" "count")

    if [[ "$format" != "json" ]]; then
        # Table goes to stderr — stdout stays clean JSON for agent piping
        {
            echo ""
            echo "  Frendli DB — Table Stats"
            echo "  ─────────────────────────"
            echo "$result" | while IFS='|' read -r entity count; do
                [[ -z "$entity" ]] && continue
                printf "  %-16s %s\n" "$entity" "$count"
            done
            echo ""
        } >&2
    fi

    success_response "$json_data"
}

action_users() {
    local params="$1"
    local limit
    limit=$(json_get "$params" ".limit")
    [[ -z "$limit" ]] && limit=20

    local sql="SELECT u.id, p.\"firstName\", u.\"phoneNumber\", u.\"isVerified\"::text,
        u.\"subscriptionTier\", p.\"latitude\"::text, p.\"longitude\"::text
        FROM \"User\" u
        LEFT JOIN \"Profile\" p ON p.\"userId\" = u.id
        ORDER BY u.\"createdAt\" DESC
        LIMIT $limit;"

    local result
    result=$(run_sql "$sql") || return 1

    local format
    format=$(json_get "$params" ".format")

    local json_data
    json_data=$(echo "$result" | rows_to_json "id" "firstName" "phoneNumber" "isVerified" "tier" "lat" "lng")

    if [[ "$format" != "json" ]]; then
        {
            echo ""
            print_table "ID|Name|Phone|Verified|Tier|Lat|Lng" "$result"
            echo ""
        } >&2
    fi

    success_response "$json_data"
}

action_hangouts() {
    local params="$1"
    local limit
    limit=$(json_get "$params" ".limit")
    [[ -z "$limit" ]] && limit=20

    local sql="SELECT h.id, h.title, h.status, h.\"startTime\"::text,
        v.name as venue,
        COUNT(a.\"userId\")::text as attendees,
        h.\"maxAttendees\"::text as max_attendees
        FROM \"Hangout\" h
        LEFT JOIN \"Venue\" v ON v.id = h.\"venueId\"
        LEFT JOIN \"HangoutAttendee\" a ON a.\"hangoutId\" = h.id
        GROUP BY h.id, h.title, h.status, h.\"startTime\", v.name, h.\"maxAttendees\"
        ORDER BY h.\"startTime\" ASC
        LIMIT $limit;"

    local result
    result=$(run_sql "$sql") || return 1

    local format
    format=$(json_get "$params" ".format")

    local json_data
    json_data=$(echo "$result" | rows_to_json "id" "title" "status" "startTime" "venue" "attendees" "maxAttendees")

    if [[ "$format" != "json" ]]; then
        {
            echo ""
            print_table "ID|Title|Status|StartTime|Venue|Attendees|Max" "$result"
            echo ""
        } >&2
    fi

    success_response "$json_data"
}

action_matches() {
    local params="$1"
    local limit
    limit=$(json_get "$params" ".limit")
    [[ -z "$limit" ]] && limit=20

    local sql="SELECT m.id,
        p1.\"firstName\" as user1,
        p2.\"firstName\" as user2,
        COUNT(msg.id)::text as messages,
        m.\"createdAt\"::text
        FROM \"Match\" m
        LEFT JOIN \"Profile\" p1 ON p1.\"userId\" = m.\"user1Id\"
        LEFT JOIN \"Profile\" p2 ON p2.\"userId\" = m.\"user2Id\"
        LEFT JOIN \"Message\" msg ON msg.\"matchId\" = m.id
        GROUP BY m.id, p1.\"firstName\", p2.\"firstName\", m.\"createdAt\"
        ORDER BY m.\"createdAt\" DESC
        LIMIT $limit;"

    local result
    result=$(run_sql "$sql") || return 1

    local format
    format=$(json_get "$params" ".format")

    local json_data
    json_data=$(echo "$result" | rows_to_json "id" "user1" "user2" "messages" "createdAt")

    if [[ "$format" != "json" ]]; then
        {
            echo ""
            print_table "ID|User1|User2|Messages|CreatedAt" "$result"
            echo ""
        } >&2
    fi

    success_response "$json_data"
}

action_waves() {
    local params="$1"
    local limit
    limit=$(json_get "$params" ".limit")
    [[ -z "$limit" ]] && limit=20

    local sql="SELECT w.id,
        ps.\"firstName\" as sender,
        pr.\"firstName\" as receiver,
        w.type,
        w.\"createdAt\"::text
        FROM \"Wave\" w
        LEFT JOIN \"Profile\" ps ON ps.\"userId\" = w.\"senderId\"
        LEFT JOIN \"Profile\" pr ON pr.\"userId\" = w.\"receiverId\"
        ORDER BY w.\"createdAt\" DESC
        LIMIT $limit;"

    local result
    result=$(run_sql "$sql") || return 1

    local format
    format=$(json_get "$params" ".format")

    local json_data
    json_data=$(echo "$result" | rows_to_json "id" "sender" "receiver" "type" "createdAt")

    if [[ "$format" != "json" ]]; then
        {
            echo ""
            print_table "ID|Sender|Receiver|Type|CreatedAt" "$result"
            echo ""
        } >&2
    fi

    success_response "$json_data"
}

action_user() {
    local params="$1"
    local user_id
    user_id=$(json_get "$params" ".id")

    if [[ -z "$user_id" ]]; then
        error_response "Missing required parameter: id" "INVALID_PARAM"
        return 1
    fi

    local sql="SELECT u.id, p.\"firstName\", u.\"phoneNumber\", u.\"isVerified\"::text,
        u.\"subscriptionTier\", p.bio,
        array_to_string(p.interests, ', ') as interests,
        p.\"friendshipStyle\", p.\"latitude\"::text, p.\"longitude\"::text
        FROM \"User\" u
        LEFT JOIN \"Profile\" p ON p.\"userId\" = u.id
        WHERE u.id = '$user_id';"

    local result
    result=$(run_sql "$sql") || return 1

    if [[ -z "$result" ]]; then
        error_response "User not found: $user_id" "NOT_FOUND"
        return 1
    fi

    local json_data
    json_data=$(echo "$result" | rows_to_json "id" "firstName" "phoneNumber" "isVerified" "tier" "bio" "interests" "friendshipStyle" "lat" "lng")

    {
        echo ""
        print_table "ID|Name|Phone|Verified|Tier|Bio|Interests|Style|Lat|Lng" "$result"
        echo ""
    } >&2

    success_response "$json_data"
}

action_venue() {
    local params="$1"
    local venue_id
    venue_id=$(json_get "$params" ".id")

    if [[ -z "$venue_id" ]]; then
        # List all venues
        local sql='SELECT id, name, category, address FROM "Venue" ORDER BY name;'
        local result
        result=$(run_sql "$sql") || return 1
        local json_data
        json_data=$(echo "$result" | rows_to_json "id" "name" "category" "address")
        {
            echo ""
            print_table "ID|Name|Category|Address" "$result"
            echo ""
        } >&2
        success_response "$json_data"
    else
        local sql="SELECT v.id, v.name, v.category, v.address,
            COUNT(h.id)::text as hangouts
            FROM \"Venue\" v
            LEFT JOIN \"Hangout\" h ON h.\"venueId\" = v.id
            WHERE v.id = '$venue_id'
            GROUP BY v.id, v.name, v.category, v.address;"
        local result
        result=$(run_sql "$sql") || return 1
        local json_data
        json_data=$(echo "$result" | rows_to_json "id" "name" "category" "address" "hangouts")
        {
            echo ""
            print_table "ID|Name|Category|Address|Hangouts" "$result"
            echo ""
        } >&2
        success_response "$json_data"
    fi
}

action_list() {
    local actions_json
    actions_json=$(printf '%s\n' "${SUPPORTED_ACTIONS[@]}" | jq -R . | jq -s .)
    success_response "$actions_json"
}

# ============================================================
# MAIN
# ============================================================

main() {
    local input=""
    read -t 10 -r input || input=""
    [[ -z "$input" ]] && input="{}"

    if ! parse_request "$input"; then
        error_response "Invalid request format" "PARSE_ERROR"
        return 1
    fi

    local action params
    action=$(json_get "$input" ".action")
    params=$(echo "$input" | jq -c '.params // {}')

    if ! require_action "$action" "${SUPPORTED_ACTIONS[@]}"; then
        error_response "Unsupported action: $action" "UNSUPPORTED_ACTION"
        return 1
    fi

    case "$action" in
        "stats")    action_stats "$params" ;;
        "users")    action_users "$params" ;;
        "hangouts") action_hangouts "$params" ;;
        "matches")  action_matches "$params" ;;
        "waves")    action_waves "$params" ;;
        "user")     action_user "$params" ;;
        "venue")    action_venue "$params" ;;
        "list")     action_list ;;
        *)          error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

- [ ] **Step 2: Make executable**

```bash
chmod +x .claude/cli/tools/db-inspect.sh
```

- [ ] **Step 3: Smoke test — list**

```bash
echo '{"action":"list","params":{}}' | ./.claude/cli/tools/db-inspect.sh
```

Expected: `success: true`, array of action names.

- [ ] **Step 4: Smoke test — stats** (requires DB running)

```bash
echo '{"action":"stats","params":{}}' | ./.claude/cli/tools/db-inspect.sh
```

Expected: Table printed to terminal + `success: true` with JSON data. If you see `DB_NOT_FOUND`, start the Docker container first.

- [ ] **Step 5: Smoke test — users**

```bash
echo '{"action":"users","params":{"limit":5}}' | ./.claude/cli/tools/db-inspect.sh
```

Expected: 5 rows (Dev, Alice, Bob, Charlie, Dana) + JSON.

- [ ] **Step 6: Smoke test — user by ID**

```bash
echo '{"action":"user","params":{"id":"00000000-0000-0000-0000-000000000001"}}' | ./.claude/cli/tools/db-inspect.sh
```

Expected: Dev user profile data.

- [ ] **Step 7: Commit**

```bash
git add .claude/cli/tools/db-inspect.sh
git commit -m "feat: add db-inspect.sh CLI tool (stats/users/hangouts/matches/waves/user/venue)"
```

---

## Chunk 3: `frendli-api.sh`

### Task 4: Create `frendli-api.sh`

**Files:**
- Create: `.claude/cli/tools/frendli-api.sh`

**Key facts:**
- API must be running (`npm run dev` in `frendli-api/`) for tests to work
- Mock auth: send `x-mock-user-id` header
- Capture HTTP status and latency with curl `-w "%{http_code}\n%{time_total}"` + `-o <bodyfile>`
- Body and curl write-out go to separate destinations to avoid mixing

- [ ] **Step 1: Write the tool**

```bash
#!/bin/bash
# Frendli API Testing Tool
# Hit any API route with mock auth or Firebase JWT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="frendli-api"
SUPPORTED_ACTIONS=("get" "post" "patch" "delete" "list")

DEFAULT_BASE_URL="http://localhost:3000"
DEFAULT_MOCK_USER_ID="00000000-0000-0000-0000-000000000001"

ROUTES=(
    "GET    /api/profile/me"
    "GET    /api/hangouts/my"
    "POST   /api/hangouts"
    "GET    /api/hangouts/:id"
    "POST   /api/hangouts/:id/join"
    "GET    /api/discovery"
    "POST   /api/waves"
    "GET    /api/matches"
    "GET    /api/venues"
    "GET    /api/groups"
    "POST   /api/groups"
    "GET    /api/interests"
    "GET    /api/friends"
    "GET    /api/perks"
    "GET    /api/subscriptions"
    "GET    /api/safety"
    "GET    /api/leads"
    "POST   /api/webhooks"
)

action_request() {
    local method="$1"
    local params="$2"

    local route mock_user_id token body base_url
    route=$(json_get "$params" ".route")
    mock_user_id=$(json_get "$params" ".mock_user_id")
    token=$(json_get "$params" ".token")
    body=$(json_get "$params" ".body")
    base_url=$(json_get "$params" ".base_url")

    if [[ -z "$route" ]]; then
        error_response "Missing required parameter: route" "INVALID_PARAM"
        return 1
    fi

    [[ -z "$mock_user_id" ]] && mock_user_id="$DEFAULT_MOCK_USER_ID"
    [[ -z "$base_url" ]]     && base_url="${FRENDLI_API_URL:-$DEFAULT_BASE_URL}"

    local url="${base_url}${route}"
    local body_file
    body_file=$(mktemp)

    # Build curl args array
    local -a curl_args=("-s" "-X" "$method" "$url" "-H" "Content-Type: application/json")

    if [[ -n "$token" && "$token" != "null" ]]; then
        curl_args+=("-H" "Authorization: Bearer $token")
    else
        curl_args+=("-H" "x-mock-user-id: $mock_user_id")
    fi

    if [[ -n "$body" && "$body" != "null" && "$body" != "{}" ]]; then
        curl_args+=("-d" "$body")
    fi

    # Capture body to file; write status_code and time_total to stdout
    curl_args+=("-o" "$body_file" "-w" "%{http_code}\n%{time_total}")

    local curl_output
    if ! curl_output=$(curl "${curl_args[@]}" 2>&1); then
        error_response "curl failed: $curl_output" "HTTP_ERROR"
        rm -f "$body_file"
        return 1
    fi

    local status_code time_total
    status_code=$(echo "$curl_output" | head -1)
    time_total=$(echo "$curl_output" | tail -1)

    local latency_ms
    latency_ms=$(awk "BEGIN {printf \"%.0f\", $time_total * 1000}")

    local body_content
    body_content=$(cat "$body_file")
    rm -f "$body_file"

    # Parse body as JSON if possible
    local body_json
    if [[ -n "$body_content" ]] && echo "$body_content" | jq empty 2>/dev/null; then
        body_json="$body_content"
    else
        body_json=$(jq -n --arg s "$body_content" '$s')
    fi

    local metadata
    metadata=$(jq -n \
        --arg method "$method" \
        --arg url "$url" \
        --arg status "$status_code" \
        --arg latency "${latency_ms}ms" \
        --arg mock_user "$mock_user_id" \
        '{method: $method, url: $url, status_code: $status, latency: $latency, mock_user_id: $mock_user}')

    success_response "$body_json" "$metadata"
}

action_get()    { action_request "GET"    "$1"; }
action_post()   { action_request "POST"   "$1"; }
action_patch()  { action_request "PATCH"  "$1"; }
action_delete() { action_request "DELETE" "$1"; }

action_list() {
    local routes_json
    routes_json=$(printf '%s\n' "${ROUTES[@]}" | jq -R . | jq -s .)
    success_response "$routes_json"
}

main() {
    local input=""
    read -t 10 -r input || input=""
    [[ -z "$input" ]] && input="{}"

    if ! parse_request "$input"; then
        error_response "Invalid request format" "PARSE_ERROR"
        return 1
    fi

    local action params
    action=$(json_get "$input" ".action")
    params=$(echo "$input" | jq -c '.params // {}')

    if ! require_action "$action" "${SUPPORTED_ACTIONS[@]}"; then
        error_response "Unsupported action: $action" "UNSUPPORTED_ACTION"
        return 1
    fi

    case "$action" in
        "get")    action_get    "$params" ;;
        "post")   action_post   "$params" ;;
        "patch")  action_patch  "$params" ;;
        "delete") action_delete "$params" ;;
        "list")   action_list ;;
        *)        error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

- [ ] **Step 2: Make executable**

```bash
chmod +x .claude/cli/tools/frendli-api.sh
```

- [ ] **Step 3: Smoke test — list**

```bash
echo '{"action":"list","params":{}}' | ./.claude/cli/tools/frendli-api.sh
```

Expected: `success: true`, array of 18 route strings.

- [ ] **Step 4: Smoke test — GET with default mock user** (API must be running)

```bash
echo '{"action":"get","params":{"route":"/api/hangouts/my"}}' | ./.claude/cli/tools/frendli-api.sh
```

Expected: `success: true`, `metadata.status_code: "200"`, `metadata.latency: "<Nms>"`, and the hangouts data.

- [ ] **Step 5: Smoke test — GET with explicit mock user**

```bash
echo '{"action":"get","params":{"route":"/api/profile/me","mock_user_id":"00000000-0000-0000-0000-000000000002"}}' | ./.claude/cli/tools/frendli-api.sh
```

Expected: Alice's profile data.

- [ ] **Step 6: Commit**

```bash
git add .claude/cli/tools/frendli-api.sh
git commit -m "feat: add frendli-api.sh CLI tool (get/post/patch/delete/list with mock auth)"
```

---

## Chunk 4: `typecheck.sh`

### Task 5: Create `typecheck.sh`

**Files:**
- Create: `.claude/cli/tools/typecheck.sh`

**Key facts:**
- `tsc --noEmit` exits non-zero when there are errors — catch this and parse the output
- Run both packages in parallel with `&` + `wait`
- Write each package's tsc output to a temp file to avoid interleaving
- Filter `node_modules` lines from output
- The `watch` action is an escape hatch — streams directly, no JSON response

- [ ] **Step 1: Write the tool**

```bash
#!/bin/bash
# Frendli TypeScript Checker
# Run tsc --noEmit across frendli-api and/or frendli-app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="typecheck"
SUPPORTED_ACTIONS=("both" "api" "app" "watch" "list")

REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
API_DIR="$REPO_ROOT/frendli-api"
APP_DIR="$REPO_ROOT/frendli-app"

run_tsc() {
    local dir="$1"
    local label="$2"
    local out_file="$3"

    # Run tsc, capture output; exit code 1 means errors found (not a script failure)
    (cd "$dir" && npx tsc --noEmit 2>&1) | grep -v "node_modules" > "$out_file" || true
}

count_errors() {
    local file="$1"
    grep -c "error TS" "$file" 2>/dev/null || echo "0"
}

format_errors() {
    local file="$1"
    local dir_prefix="$2"
    grep "error TS" "$file" 2>/dev/null | sed "s|$dir_prefix/||g" | while IFS= read -r line; do
        echo "  $line"
    done
}

print_summary() {
    local api_count="$1"
    local app_count="$2"

    local api_icon="✅"
    local app_icon="✅"
    [[ "$api_count" -gt 0 ]] && api_icon="❌"
    [[ "$app_count" -gt 0 ]] && app_icon="❌"

    echo ""
    echo "  ┌──────────────────────────────────────┐"
    printf "  │  frendli-api   %s %-3s errors          │\n" "$api_icon" "$api_count"
    printf "  │  frendli-app   %s %-3s errors          │\n" "$app_icon" "$app_count"
    echo "  └──────────────────────────────────────┘"
    echo ""
}

action_both() {
    local params="$1"
    local verbose
    verbose=$(json_get "$params" ".verbose")

    local api_out app_out
    api_out=$(mktemp)
    app_out=$(mktemp)

    log_info "Running tsc in parallel for frendli-api and frendli-app..."
    run_tsc "$API_DIR" "frendli-api" "$api_out" &
    run_tsc "$APP_DIR" "frendli-app" "$app_out" &
    wait

    local api_count app_count
    api_count=$(count_errors "$api_out")
    app_count=$(count_errors "$app_out")

    print_summary "$api_count" "$app_count"

    if [[ "$api_count" -gt 0 ]]; then
        echo "frendli-api errors:"
        format_errors "$api_out" "$API_DIR"
        echo ""
    fi

    if [[ "$app_count" -gt 0 ]]; then
        echo "frendli-app errors:"
        format_errors "$app_out" "$APP_DIR"
        echo ""
    fi

    rm -f "$api_out" "$app_out"

    local total=$((api_count + app_count))
    local result_json
    result_json=$(jq -n \
        --argjson api "$api_count" \
        --argjson app "$app_count" \
        --argjson total "$total" \
        '{api_errors: $api, app_errors: $app, total_errors: $total}')

    success_response "$result_json"
}

action_api() {
    local params="$1"
    local out_file
    out_file=$(mktemp)

    log_info "Running tsc for frendli-api..."
    run_tsc "$API_DIR" "frendli-api" "$out_file"

    local count
    count=$(count_errors "$out_file")

    local api_icon="✅"
    [[ "$count" -gt 0 ]] && api_icon="❌"

    echo ""
    echo "  frendli-api: $api_icon $count errors"
    echo ""

    if [[ "$count" -gt 0 ]]; then
        format_errors "$out_file" "$API_DIR"
        echo ""
    fi

    rm -f "$out_file"
    success_response "$(jq -n --argjson c "$count" '{api_errors: $c}')"
}

action_app() {
    local params="$1"
    local out_file
    out_file=$(mktemp)

    log_info "Running tsc for frendli-app..."
    run_tsc "$APP_DIR" "frendli-app" "$out_file"

    local count
    count=$(count_errors "$out_file")

    local app_icon="✅"
    [[ "$count" -gt 0 ]] && app_icon="❌"

    echo ""
    echo "  frendli-app: $app_icon $count errors"
    echo ""

    if [[ "$count" -gt 0 ]]; then
        format_errors "$out_file" "$APP_DIR"
        echo ""
    fi

    rm -f "$out_file"
    success_response "$(jq -n --argjson c "$count" '{app_errors: $c}')"
}

action_watch() {
    local params="$1"
    local package
    package=$(json_get "$params" ".package")

    if [[ -z "$package" ]]; then
        echo "Error: package param required for watch (\"api\" or \"app\")" >&2
        exit 1
    fi

    # TERMINAL ESCAPE HATCH — bypasses JSON I/O contract, streams directly
    if [[ "$package" == "api" ]]; then
        echo "Watching frendli-api (Ctrl+C to stop)..."
        cd "$API_DIR" && npx tsc --noEmit --watch
    elif [[ "$package" == "app" ]]; then
        echo "Watching frendli-app (Ctrl+C to stop)..."
        cd "$APP_DIR" && npx tsc --noEmit --watch
    else
        echo "Error: package must be \"api\" or \"app\"" >&2
        exit 1
    fi
}

action_list() {
    local actions_json
    actions_json=$(printf '%s\n' "${SUPPORTED_ACTIONS[@]}" | jq -R . | jq -s .)
    success_response "$actions_json"
}

main() {
    local input=""
    read -t 10 -r input || input=""
    [[ -z "$input" ]] && input="{}"

    # watch action: parse minimally without full parse_request (it's an escape hatch)
    local action
    action=$(echo "$input" | jq -r '.action // empty' 2>/dev/null || echo "")
    if [[ "$action" == "watch" ]]; then
        local params
        params=$(echo "$input" | jq -c '.params // {}')
        action_watch "$params"
        return 0
    fi

    if ! parse_request "$input"; then
        error_response "Invalid request format" "PARSE_ERROR"
        return 1
    fi

    local params
    params=$(echo "$input" | jq -c '.params // {}')

    if ! require_action "$action" "${SUPPORTED_ACTIONS[@]}"; then
        error_response "Unsupported action: $action" "UNSUPPORTED_ACTION"
        return 1
    fi

    case "$action" in
        "both")  action_both "$params" ;;
        "api")   action_api  "$params" ;;
        "app")   action_app  "$params" ;;
        "list")  action_list ;;
        *)       error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

- [ ] **Step 2: Make executable**

```bash
chmod +x .claude/cli/tools/typecheck.sh
```

- [ ] **Step 3: Smoke test — list**

```bash
echo '{"action":"list","params":{}}' | ./.claude/cli/tools/typecheck.sh
```

Expected: `success: true`, array of action names.

- [ ] **Step 4: Smoke test — api only**

```bash
echo '{"action":"api","params":{}}' | ./.claude/cli/tools/typecheck.sh
```

Expected: Summary line `frendli-api: ✅ 0 errors` or `❌ N errors` + error list + `success: true` JSON.

- [ ] **Step 5: Smoke test — both packages**

```bash
echo '{"action":"both","params":{}}' | ./.claude/cli/tools/typecheck.sh
```

Expected: Box summary showing counts for both packages, errors listed below for whichever has errors.

- [ ] **Step 6: Commit**

```bash
git add .claude/cli/tools/typecheck.sh
git commit -m "feat: add typecheck.sh CLI tool (tsc --noEmit across both packages, parallel)"
```

---

## Chunk 5: Governance Files + Orchestrator Update

### Task 6: Update `README.md`

**Files:**
- Replace: `README.md`

- [ ] **Step 1: Read existing README.md** — note any sections worth keeping

- [ ] **Step 2: Write the Frendli README**

```markdown
# Frendli

A mobile app for real-world social connections — find people nearby, join hangouts at local venues, and build genuine friendships.

## What It Is

Frendli helps people discover others with shared interests, wave at each other (like), get matched, and meet up at curated local venues through Hangouts. Think of it as a friendship app — not dating.

## Monorepo Structure

```
frendli/
├── frendli-api/        # Node/Express 5 backend
│   ├── src/
│   │   ├── routes/     # 13 route files
│   │   ├── services/   # Business logic
│   │   └── middleware/ # Auth, validation
│   └── prisma/         # Schema + seed
├── frendli-app/        # React Native / Expo mobile app
│   ├── app/            # Expo Router screens
│   ├── components/     # Shared UI components
│   ├── store/          # Zustand state
│   └── lib/            # API client, utilities
└── .claude/cli/tools/  # Developer CLI tools
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native, Expo SDK, Expo Router |
| Styling | NativeWind (Tailwind for RN) |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (Docker), Prisma 6 ORM |
| Auth | Firebase Auth (not yet wired — currently in mock mode) |
| Realtime | Socket.io |
| Storage | Supabase (keys not yet configured) |

## Local Dev Setup

**Prerequisites:** Docker, Node.js 20+, Expo Go app on your phone

**1. Start the database:**
```bash
docker compose up -d   # or however your local DB is configured
```

**2. Run the API:**
```bash
cd frendli-api
npm install
npm run dev
# → http://localhost:3000
# ⚠️  Supabase keys not set — running in mock auth mode (expected for local dev)
```

**3. Seed test data:**
```bash
echo '{"action":"seed","params":{}}' | ./.claude/cli/tools/prisma-ops.sh
```

**4. Run the mobile app:**
```bash
cd frendli-app
npm install
npx expo start
# → Scan QR code with Expo Go
```

## Auth Status

The API is currently in **mock auth mode** — Supabase keys are not configured. Send `x-mock-user-id: <user-id>` on any request. Default test user: `00000000-0000-0000-0000-000000000001`.

## CLI Tools

All tools accept JSON from stdin and emit `{success, data, error, metadata}` JSON.

| Tool | Purpose | Example |
|------|---------|---------|
| `frendli-api.sh` | Hit API routes with auth | `echo '{"action":"get","params":{"route":"/api/hangouts/my"}}' \| ./frendli-api.sh` |
| `db-inspect.sh` | Query DB state | `echo '{"action":"stats","params":{}}' \| ./db-inspect.sh` |
| `typecheck.sh` | TypeScript checks | `echo '{"action":"both","params":{}}' \| ./typecheck.sh` |
| `prisma-ops.sh` | DB migrations + seed | `echo '{"action":"seed","params":{}}' \| ./prisma-ops.sh` |

All tools are in `.claude/cli/tools/`. See [`.agent-rules/04-cli-tools.md`](.agent-rules/04-cli-tools.md) for full usage.

## API Routes

```
GET  /api/profile/me        GET  /api/discovery
GET  /api/hangouts/my       POST /api/waves
POST /api/hangouts          GET  /api/matches
GET  /api/hangouts/:id      GET  /api/venues
POST /api/hangouts/:id/join GET  /api/friends
GET  /api/groups            GET  /api/perks
POST /api/groups            GET  /api/subscriptions
GET  /api/interests         GET  /api/safety
```

## Docs

- [`docs/superpowers/specs/`](docs/superpowers/specs/) — Feature design specs
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — Implementation plans
- [`ANTIGRAVITY.md`](ANTIGRAVITY.md) — Project integration map
- [`Global_Manifest.md`](Global_Manifest.md) — Active state source of truth
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README.md with Frendli project details"
```

---

### Task 7: Update `ANTIGRAVITY.md`

**Files:**
- Replace: `ANTIGRAVITY.md`

- [ ] **Step 1: Read existing ANTIGRAVITY.md** — preserve section headings that `00-orchestrator.md` boot protocol references

- [ ] **Step 2: Write the Frendli ANTIGRAVITY**

```markdown
# ANTIGRAVITY — Frendli Project Integration Map

## Project Overview

Frendli is a mobile app for real-world social connections. Users discover nearby people with shared interests, send "waves" (likes), get matched, and meet up through Hangouts at local venues. The goal is genuine in-person friendship, not chat.

**Users:** People aged 18–35 looking for new friends in their city.
**Key flow:** Discover → Wave → Match → Hangout → Meet in person.

## Governance Files

- **`Global_Manifest.md`** — Active files, tasks, and integration status (read this first)
- **`.agent-rules/project_context.md`** — Tech standards, coding rules, critical constraints
- **`.agent-rules/lessons_learned.md`** — Gotchas, resolved bugs, environment-specific notes

## Directory Structure

```
frendli/
├── frendli-api/              # Express 5 + TypeScript backend
│   ├── src/
│   │   ├── index.ts          # Entry point, Express app + socket.io setup
│   │   ├── routes/           # 13 route files (hangouts, profile, discovery, ...)
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Auth (mock mode), validation
│   ├── prisma/
│   │   ├── schema.prisma     # Full data model (User, Profile, Hangout, Match, Wave, ...)
│   │   └── seed.ts           # Test seed: 5 users, 3 venues, 3 hangouts, 2 matches
│   ├── .env                  # DATABASE_URL, PORT, SUPABASE keys (SUPABASE_ANON_KEY empty)
│   └── package.json
├── frendli-app/              # React Native + Expo mobile app
│   ├── app/                  # Expo Router screens
│   ├── components/           # Shared UI components
│   ├── store/                # Zustand state management
│   ├── lib/                  # API client, utilities
│   └── package.json
├── .claude/
│   └── cli/tools/            # 10 CLI tools (6 generic + 4 Frendli-specific)
├── .agent-rules/             # Agent orchestration rules
├── .agent-skills/            # Reusable agent capabilities
├── .agent-workflows/         # Multi-step workflow definitions
└── docs/superpowers/         # Specs and implementation plans
```

## Core Capabilities & CLI Tool Mapping

| Capability | CLI Tool | Example |
|-----------|---------|---------|
| API endpoint testing | `frendli-api.sh` | Test any route with mock user auth |
| DB state inspection | `db-inspect.sh` | Get counts, list records, inspect users |
| TypeScript checking | `typecheck.sh` | Run tsc across both packages |
| Prisma operations | `prisma-ops.sh` | Migrate, seed, reset, studio |
| HTTP requests (generic) | `http-client.sh` | External API calls |
| Data transformation | `json-processor.sh` | Pipe and transform JSON |
| File operations | `file-processor.sh` | Read/write/search files |
| Git operations | `git-ops.sh` | Status, log, commit |

## Integration Points

| Service | Status | Notes |
|---------|--------|-------|
| PostgreSQL (Docker) | ✅ Running | `localhost:5432/frendlidb` |
| Firebase Auth | ⚠️ Not wired | API runs in mock mode (`x-mock-user-id` header) |
| Supabase | ⚠️ Keys not set | `SUPABASE_ANON_KEY` is empty in `.env` |
| Socket.io | ✅ Installed | Real-time messaging infrastructure ready |
| Expo Go | ✅ Working | Scan QR from `npx expo start` |

## Data Model Summary

Key models in `prisma/schema.prisma`:
- `User` — phone auth, subscription tier, streak count
- `Profile` — firstName, bio, interests[], location, friendshipStyle
- `Hangout` — title, venue, startTime, attendees, maxAttendees, isPublic
- `Wave` — senderId → receiverId (like/pass)
- `Match` — user1Id + user2Id (from mutual waves)
- `Message` — belongs to a Match
- `Venue` — name, address, lat/lng, category, perks

## Test Seed Data (Deterministic IDs)

| User | UUID |
|------|------|
| Dev (default) | `00000000-0000-0000-0000-000000000001` |
| Alice | `00000000-0000-0000-0000-000000000002` |
| Bob | `00000000-0000-0000-0000-000000000003` |
| Charlie | `00000000-0000-0000-0000-000000000004` |
| Dana | `00000000-0000-0000-0000-000000000005` |

## Agent Team Workflow

- **Architect**: Plans features, reads spec files in `docs/superpowers/specs/`, uses `http-client` to verify API shape
- **Builder**: Writes code, uses `frendli-api.sh` to test routes, `prisma-ops.sh` for schema changes
- **Inspector**: Uses `typecheck.sh` for TS validation, `db-inspect.sh` to verify data, `git-ops.sh` for repo state

## Dependencies

- `jq` — required by all CLI tools (install: `winget install jqlang.jq`)
- Docker — for local PostgreSQL
- Node.js 20+ — for both packages
- Expo Go — for mobile testing
```

- [ ] **Step 3: Commit**

```bash
git add ANTIGRAVITY.md
git commit -m "docs: rewrite ANTIGRAVITY.md with Frendli project integration map"
```

---

### Task 8: Update `Global_Manifest.md`

**Files:**
- Replace: `Global_Manifest.md`

- [ ] **Step 1: Read existing Global_Manifest.md** — note structure used by orchestrator

- [ ] **Step 2: Write the Frendli Global Manifest**

```markdown
# Global Manifest — Frendli

*Single source of truth for active project state. Update this file when status changes.*

**Last updated:** 2026-03-17

---

## Active Packages

| Package | Status | Notes |
|---------|--------|-------|
| `frendli-api` | ✅ Running | Mock auth mode. `npm run dev` → `localhost:3000` |
| `frendli-app` | ⚠️ Has TS errors | See TypeScript section below |

## Known Issues

| Issue | Severity | Status |
|-------|---------|--------|
| `SUPABASE_ANON_KEY` not set | Medium | API in mock mode — expected for local dev |
| TypeScript errors in `frendli-app` | Medium | Run `typecheck.sh app` for current count |
| Firebase Auth not integrated | High | No real auth yet — using `x-mock-user-id` header |

## CLI Tools (`.claude/cli/tools/`)

### Frendli-Specific
| Tool | Actions |
|------|---------|
| `frendli-api.sh` | `get`, `post`, `patch`, `delete`, `list` |
| `db-inspect.sh` | `stats`, `users`, `hangouts`, `matches`, `waves`, `user`, `venue` |
| `typecheck.sh` | `both`, `api`, `app`, `watch` |
| `prisma-ops.sh` | `migrate`, `generate`, `push`, `reset`, `seed`, `studio`, `status` |

### Generic Framework
| Tool | Actions |
|------|---------|
| `http-client.sh` | `request`, `get`, `post`, `head` |
| `json-processor.sh` | `validate`, `transform`, `format`, `query` |
| `file-processor.sh` | `read`, `write`, `search`, `list` |
| `git-ops.sh` | `status`, `log`, `commit`, `branch` |
| `benchmark.sh` | `run`, `compare`, `report` |
| `market-research.sh` | `analyze`, `compare`, `report` |

## API Routes (13 route files)

```
frendli-api/src/routes/
├── profile.ts       GET /api/profile/me, PATCH /api/profile
├── hangouts.ts      GET/POST /api/hangouts, GET/POST hangout actions
├── discovery.ts     GET /api/discovery
├── waves.ts         POST /api/waves
├── matches.ts       GET /api/matches
├── venues.ts        GET /api/venues
├── groups.ts        GET/POST /api/groups
├── friends.ts       GET /api/friends
├── interests.ts     GET /api/interests
├── perks.ts         GET /api/perks
├── subscription.ts  GET /api/subscriptions
├── safety.ts        GET /api/safety
├── leads.ts         GET /api/leads
└── webhooks.ts      POST /api/webhooks
```

## Tech Stack Versions

| Tech | Version |
|------|---------|
| Express | 5.2.1 |
| Prisma | 6.19.2 |
| TypeScript | 5.9.3 |
| firebase-admin | 13.7.0 |
| Socket.io | 4.8.3 |
| Expo SDK | (see frendli-app/package.json) |

## Test Seed Data

Run `echo '{"action":"seed","params":{}}' | ./.claude/cli/tools/prisma-ops.sh` to populate.

Default mock user ID: `00000000-0000-0000-0000-000000000001`

## Docs & Plans

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/` | Feature design specs (approved, reviewed) |
| `docs/superpowers/plans/` | Implementation plans (ready to execute) |
| `ANTIGRAVITY.md` | Project structure + integration map |
| `.agent-rules/00-orchestrator.md` | Agent boot protocol + tool inventory |
```

- [ ] **Step 3: Commit**

```bash
git add Global_Manifest.md
git commit -m "docs: rewrite Global_Manifest.md with live Frendli project state"
```

---

### Task 9: Update `00-orchestrator.md`

**Files:**
- Modify: `.agent-rules/00-orchestrator.md`

- [ ] **Step 1: Read `.agent-rules/00-orchestrator.md`**

- [ ] **Step 2: Update the CLI TOOL FRAMEWORK section** — add the 4 new tools to the `Available tools` list and add a new `FRENDLI-SPECIFIC TOOLS` section

Find this line:
```
- Available tools: `http-client`, `json-processor`, `git-ops`, `file-processor`, `market-research`, `benchmark`
```

Replace with:
```
- Available tools (generic): `http-client`, `json-processor`, `git-ops`, `file-processor`, `market-research`, `benchmark`
- Available tools (Frendli-specific): `frendli-api`, `db-inspect`, `typecheck`, `prisma-ops`
```

Then add a new section after `### AGENT ROLE INTEGRATION`:

```markdown
### FRENDLI-SPECIFIC TOOL USAGE

- **`frendli-api`**: Test API routes with mock auth. Use `x-mock-user-id` header defaults to `00000000-0000-0000-0000-000000000001`. Requires API server running (`localhost:3000`).
- **`db-inspect`**: Query DB state without the API running. Uses Docker psql. Actions: `stats`, `users`, `hangouts`, `matches`, `waves`, `user`, `venue`.
- **`typecheck`**: Run `tsc --noEmit` across both packages. Use `both` to check everything, `api`/`app` for one package. Never invoke `watch` action from an agent.
- **`prisma-ops`**: Migrate, seed, reset database. `reset` always requires `{"confirm": true}` — never pass this without explicit user approval.
```

- [ ] **Step 3: Smoke test — verify updated file reads correctly**

```bash
grep -c "frendli-api\|db-inspect\|typecheck\|prisma-ops" .agent-rules/00-orchestrator.md
```

Expected output: `2`

- [ ] **Step 4: Commit**

```bash
git add .agent-rules/00-orchestrator.md
git commit -m "feat: update orchestrator with 4 Frendli CLI tools in tool inventory"
```

---

## Final Verification

- [ ] **Run all 4 tools — list action**

```bash
for tool in frendli-api db-inspect typecheck prisma-ops; do
  echo "=== $tool ==="
  echo '{"action":"list","params":{}}' | ./.claude/cli/tools/${tool}.sh | jq .success
done
```

Expected: `true` four times.

- [ ] **Run typecheck on both packages**

```bash
echo '{"action":"both","params":{}}' | ./.claude/cli/tools/typecheck.sh
```

Expected: Box summary with error counts.

- [ ] **Run db stats** (Docker must be running)

```bash
echo '{"action":"stats","params":{}}' | ./.claude/cli/tools/db-inspect.sh
```

Expected: Row counts for all tables.

- [ ] **Final commit if any loose files**

```bash
git status
git add -p   # review and stage any uncommitted changes
git commit -m "chore: final cleanup and verification"
```
