#!/bin/bash
# match-scorer.sh — Tests the weighted matching algorithm between two user IDs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="match-scorer"
SUPPORTED_ACTIONS=("score" "score-bulk" "rank-name")

action_score() {
    local params="$1"
    local user_a=$(json_get "$params" ".userAId")
    local user_b=$(json_get "$params" ".userBId")

    if [[ -z "$user_a" || -z "$user_b" ]]; then
        error_response "Missing required params: userAId, userBId" "INVALID_PARAM"
        return 1
    fi

    log_info "Scoring $user_a vs $user_b"

    node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function weightedOverlap(a, b) {
  const shared = a.interests.filter(i => b.interests.includes(i));
  if (!shared.length) return 0;
  const wA = a.interestWeights ?? {};
  const wB = b.interestWeights ?? {};
  const num = shared.reduce((s, i) => s + Math.min(wA[i] ?? 5, wB[i] ?? 5) / 10, 0);
  return num / shared.length;
}

const RANKS = [
  {n:'Absolute Strangers',min:0,max:6},{n:'Just Sprouting',min:7,max:12},
  {n:'Ships Passing',min:13,max:18},{n:'Distant Signals',min:19,max:24},
  {n:'Faint Spark',min:25,max:29},{n:'Kinda Buds',min:30,max:34},
  {n:'Something There',min:35,max:38},{n:'A Spark of Something',min:39,max:43},
  {n:'Getting Warmer',min:44,max:48},{n:'Solid Overlap',min:49,max:52},
  {n:'Clicking a Bit',min:53,max:56},{n:'On the Same Page',min:57,max:60},
  {n:'Same Tune',min:61,max:64},{n:'Same Wavelength',min:65,max:68},
  {n:\"Your Kind of People\",min:69,max:72},{n:'Mate Material',min:73,max:75},
  {n:'Kindred Spirits',min:76,max:79},{n:'Proper Pals',min:80,max:82},
  {n:'Friendship Goals',min:83,max:85},{n:'Dynamic Duo',min:86,max:88},
  {n:'Rare Find',min:89,max:91},{n:'Best Mate Energy',min:92,max:94},
  {n:'Practically Twins',min:95,max:96},{n:'Super Best Mates',min:97,max:98},
  {n:'Friendship Soulmates',min:99,max:100}
];

async function run() {
  const [pA, pB] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: '$user_a' } }),
    prisma.profile.findUnique({ where: { userId: '$user_b' } }),
  ]);
  if (!pA || !pB) { console.log(JSON.stringify({ error: 'Profile not found' })); return; }

  const interestScore = (await weightedOverlap(pA, pB)) * 40;
  const sharedInterests = pA.interests.filter(i => pB.interests.includes(i));

  let locationScore = 0;
  if (pA.latitude && pB.latitude) {
    const R = 6371, dLat = (pB.latitude - pA.latitude) * Math.PI/180, dLon = (pB.longitude - pA.longitude) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(pA.latitude*Math.PI/180)*Math.cos(pB.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    locationScore = Math.max(0, (1 - dist/50) * 30);
  }

  const uA = pA.availability ?? {}, uB = pB.availability ?? {};
  const daysA = uA.days ?? [], daysB = uB.days ?? [];
  const overlapDays = daysA.filter(d => daysB.includes(d));
  const availScore = daysA.length ? (overlapDays.length / Math.max(daysA.length,1)) * 20 : 0;
  const styleScore = pA.friendshipStyle === pB.friendshipStyle ? 10 : 0;

  const total = Math.min(100, Math.round(interestScore + locationScore + availScore + styleScore));
  const rank = RANKS.find(r => total >= r.min && total <= r.max) ?? RANKS[0];

  console.log(JSON.stringify({
    score: total,
    rank: rank.n,
    breakdown: {
      interestScore: Math.round(interestScore * 10) / 10,
      locationScore: Math.round(locationScore * 10) / 10,
      availabilityScore: Math.round(availScore * 10) / 10,
      styleScore,
    },
    sharedInterests,
  }));
  await prisma.\$disconnect();
}
run();
" 2>/dev/null
}

action_score_bulk() {
    local params="$1"
    local user_id=$(json_get "$params" ".userId")
    if [[ -z "$user_id" ]]; then
        error_response "Missing required param: userId" "INVALID_PARAM"
        return 1
    fi
    local api_base="${API_BASE_URL:-http://localhost:3000}"
    local token="${AUTH_TOKEN:-}"
    if [[ -z "$token" ]]; then
        error_response "Set AUTH_TOKEN env var to a valid JWT for this user" "AUTH_REQUIRED"
        return 1
    fi
    curl -s -H "Authorization: Bearer $token" "$api_base/api/discovery" | \
        node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const ranked = (data.recommendations ?? []).sort((a,b) => b.score - a.score);
console.log(JSON.stringify({ total: ranked.length, topMatches: ranked.slice(0,5).map(r => ({ name: r.firstName, score: r.score, rank: r.rank?.name })) }));
"
}

action_rank_name() {
    local params="$1"
    local score=$(json_get "$params" ".score")
    if [[ -z "$score" ]]; then
        error_response "Missing required param: score" "INVALID_PARAM"
        return 1
    fi
    node -e "
const RANKS = [
  {n:'Absolute Strangers',min:0,max:6},{n:'Just Sprouting',min:7,max:12},
  {n:'Ships Passing',min:13,max:18},{n:'Distant Signals',min:19,max:24},
  {n:'Faint Spark',min:25,max:29},{n:'Kinda Buds',min:30,max:34},
  {n:'Something There',min:35,max:38},{n:'A Spark of Something',min:39,max:43},
  {n:'Getting Warmer',min:44,max:48},{n:'Solid Overlap',min:49,max:52},
  {n:'Clicking a Bit',min:53,max:56},{n:'On the Same Page',min:57,max:60},
  {n:'Same Tune',min:61,max:64},{n:'Same Wavelength',min:65,max:68},
  {n:\"Your Kind of People\",min:69,max:72},{n:'Mate Material',min:73,max:75},
  {n:'Kindred Spirits',min:76,max:79},{n:'Proper Pals',min:80,max:82},
  {n:'Friendship Goals',min:83,max:85},{n:'Dynamic Duo',min:86,max:88},
  {n:'Rare Find',min:89,max:91},{n:'Best Mate Energy',min:92,max:94},
  {n:'Practically Twins',min:95,max:96},{n:'Super Best Mates',min:97,max:98},
  {n:'Friendship Soulmates',min:99,max:100}
];
const s = $score;
const r = RANKS.find(r => s >= r.min && s <= r.max) ?? RANKS[0];
console.log(JSON.stringify({ score: s, rank: r.n }));
"
}

INPUT=$(cat)
ACTION=$(json_get "$INPUT" ".action")
PARAMS=$(json_get "$INPUT" ".params // {}")

case "$ACTION" in
    score)       action_score "$PARAMS" ;;
    score-bulk)  action_score_bulk "$PARAMS" ;;
    rank-name)   action_rank_name "$PARAMS" ;;
    *)           error_response "Unknown action: $ACTION. Supported: ${SUPPORTED_ACTIONS[*]}" "INVALID_ACTION" ;;
esac
