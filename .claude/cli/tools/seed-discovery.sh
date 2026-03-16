#!/bin/bash
# seed-discovery.sh — Seeds the database with realistic mock profiles for testing the Discover page
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="seed-discovery"
SUPPORTED_ACTIONS=("seed" "clear" "list" "seed-waves")

action_seed() {
    local params="$1"
    local count=$(json_get "$params" ".count // 20")
    local city=$(json_get "$params" ".city // \"Osaka\"")
    local lat=$(json_get "$params" ".lat // 34.6937")
    local lng=$(json_get "$params" ".lng // 135.5023")
    local radius_km=$(json_get "$params" ".radiusKm // 5")
    local clear_existing=$(json_get "$params" ".clearExisting // false")

    log_info "Seeding $count profiles in $city (lat=$lat, lng=$lng, radius=${radius_km}km)"

    local api_base="${API_BASE_URL:-http://localhost:3000}"

    local health_status
    health_status=$(curl -s -o /dev/null -w "%{http_code}" "$api_base/health" 2>/dev/null || echo "000")
    if [[ "$health_status" != "200" ]]; then
        error_response "API not reachable at $api_base (status: $health_status). Is the server running?" "API_UNREACHABLE"
        return 1
    fi

    if [[ "$clear_existing" == "true" ]]; then
        log_info "Clearing existing seed profiles..."
        node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.profile.deleteMany({ where: { firstName: { startsWith: 'Seed_' } } })
  .then(r => { console.log('Deleted ' + r.count + ' seed profiles'); prisma.\$disconnect(); });
" 2>/dev/null || log_warn "Clear step failed — continuing"
    fi

    node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const count = $count;
const lat = $lat;
const lng = $lng;
const radiusKm = $radius_km;
const interests = ['coffee','hiking','gaming','yoga','cooking','music','photography','reading','cycling','board games'];
const styles = ['one-on-one','small-group','open'];
const ranks = [];

async function run() {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radiusKm / 111;
    const pLat = lat + dist * Math.cos(angle);
    const pLng = lng + dist * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    const userInterests = interests.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
    const weights = {};
    userInterests.forEach(i => { weights[i] = 1 + Math.floor(Math.random() * 10); });
    const user = await prisma.user.create({
      data: {
        phoneNumber: '+8190000' + String(i).padStart(5,'0'),
        profile: {
          create: {
            firstName: 'Seed_User' + i,
            interests: userInterests,
            interestWeights: weights,
            friendshipStyle: styles[i % styles.length],
            latitude: pLat,
            longitude: pLng,
            dob: new Date(1990 + Math.floor(Math.random() * 15), 0, 1),
            availability: { days: ['Saturday','Sunday'], times: ['afternoon'] }
          }
        }
      }
    });
    ranks.push(user.id);
  }
  console.log(JSON.stringify({ created: count, userIds: ranks }));
  await prisma.\$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null
    local result_data="{\"seeded\": $count, \"city\": \"$city\", \"note\": \"Profiles prefixed Seed_ for easy cleanup\"}"
    success_response "$result_data"
}

action_clear() {
    log_info "Clearing all seed profiles (firstName starts with Seed_)"
    node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.profile.findMany({ where: { firstName: { startsWith: 'Seed_' } }, select: { userId: true } })
  .then(profiles => {
    const ids = profiles.map(p => p.userId);
    return prisma.user.deleteMany({ where: { id: { in: ids } } });
  })
  .then(r => { console.log(JSON.stringify({ deleted: r.count })); prisma.\$disconnect(); });
" 2>/dev/null
    success_response "{\"cleared\": true}"
}

action_list() {
    node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.profile.findMany({ where: { firstName: { startsWith: 'Seed_' } }, select: { firstName: true, userId: true, interests: true } })
  .then(p => { console.log(JSON.stringify({ count: p.length, profiles: p })); prisma.\$disconnect(); });
" 2>/dev/null
}

action_seed_waves() {
    local params="$1"
    local from_user=$(json_get "$params" ".fromUserId")
    if [[ -z "$from_user" ]]; then
        error_response "Missing required param: fromUserId" "INVALID_PARAM"
        return 1
    fi
    log_info "Seeding waves from $from_user to all Seed_ profiles"
    node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const targets = await prisma.profile.findMany({ where: { firstName: { startsWith: 'Seed_' } }, select: { userId: true } });
  let count = 0;
  for (const t of targets) {
    await prisma.wave.upsert({
      where: { senderId_receiverId: { senderId: '$from_user', receiverId: t.userId } },
      create: { senderId: '$from_user', receiverId: t.userId, type: 'like' },
      update: {},
    }).catch(() => {});
    count++;
  }
  console.log(JSON.stringify({ wavesCreated: count }));
  await prisma.\$disconnect();
}
run();
" 2>/dev/null
    success_response "{\"done\": true}"
}

INPUT=$(cat)
ACTION=$(json_get "$INPUT" ".action")
PARAMS=$(json_get "$INPUT" ".params // {}")

case "$ACTION" in
    seed)       action_seed "$PARAMS" ;;
    clear)      action_clear ;;
    list)       action_list ;;
    seed-waves) action_seed_waves "$PARAMS" ;;
    *)          error_response "Unknown action: $ACTION. Supported: ${SUPPORTED_ACTIONS[*]}" "INVALID_ACTION" ;;
esac
