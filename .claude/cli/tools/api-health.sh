#!/bin/bash
# api-health.sh — Hits every API endpoint and validates status codes
# Exit codes: 0 = all green, 1 = warnings, 2 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="api-health"
SUPPORTED_ACTIONS=("check-all" "check-route" "check-discovery" "check-safety")

API_BASE="${API_BASE_URL:-http://localhost:3000}"
AUTH_HDR="Authorization: Bearer ${AUTH_TOKEN:-}"

check_route() {
    local method="$1" path="$2" expected_status="$3" label="$4"
    local start_ms=$(($(date +%s%3N)))
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
        -H "$AUTH_HDR" -H "Content-Type: application/json" \
        "$API_BASE$path" 2>/dev/null || echo "000")
    local end_ms=$(($(date +%s%3N)))
    local elapsed=$((end_ms - start_ms))
    local ok="false"
    [[ "$status" == "$expected_status" ]] && ok="true"
    echo "{\"route\": \"$label\", \"status\": $status, \"expected\": $expected_status, \"ok\": $ok, \"ms\": $elapsed}"
}

action_check_all() {
    log_info "Running full API health check against $API_BASE"
    local results=()
    local failures=0

    results+=("$(check_route GET  "/api/discovery"             200 "GET /api/discovery")")
    results+=("$(check_route GET  "/api/discovery/snoozes"     200 "GET /api/discovery/snoozes")")
    results+=("$(check_route GET  "/api/profile"               200 "GET /api/profile")")
    results+=("$(check_route GET  "/api/hangouts"              200 "GET /api/hangouts")")
    results+=("$(check_route GET  "/api/friends"               200 "GET /api/friends")")
    results+=("$(check_route GET  "/api/perks"                 200 "GET /api/perks")")
    results+=("$(check_route POST "/api/discovery/wave"        400 "POST /api/discovery/wave (no body → 400)")")
    results+=("$(check_route GET  "/api/nonexistent"           404 "GET /nonexistent → 404")")

    for r in "${results[@]}"; do
        local ok
        ok=$(echo "$r" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).ok.toString())" 2>/dev/null)
        [[ "$ok" == "false" ]] && ((failures++)) || true
    done

    local joined
    joined=$(IFS=,; echo "[${results[*]}]")
    local exit_code=0
    [[ $failures -gt 0 ]] && exit_code=2

    echo "{\"summary\": {\"total\": ${#results[@]}, \"failures\": $failures}, \"results\": $joined}"
    return $exit_code
}

action_check_route() {
    local params="$1"
    local method=$(json_get "$params" ".method // \"GET\"")
    local path=$(json_get "$params" ".path")
    local expected=$(json_get "$params" ".expectedStatus // 200")
    if [[ -z "$path" ]]; then
        error_response "Missing required param: path" "INVALID_PARAM"
        return 1
    fi
    check_route "$method" "$path" "$expected" "$method $path"
}

action_check_discovery() {
    log_info "Checking discovery endpoint response shape"
    local raw
    raw=$(curl -s -H "$AUTH_HDR" "$API_BASE/api/discovery" 2>/dev/null)
    echo "$raw" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const checks = {
  hasRecommendations: Array.isArray(d.recommendations),
  hasRankOnFirstRec: d.recommendations?.[0]?.rank?.name != null,
  hasSuggestedActivity: 'suggestedActivity' in (d.recommendations?.[0] ?? {}),
  hasStreakCount: typeof d.streakCount === 'number',
  take15Enforced: (d.recommendations?.length ?? 0) <= 15,
};
console.log(JSON.stringify(checks));
" 2>/dev/null || echo '{"error": "Failed to parse discovery response"}'
}

action_check_safety() {
    log_info "Checking safety-critical routes"
    local results=()
    results+=("$(check_route GET "/api/discovery/snoozes" 200 "snoozes auth check")")
    local unauth_status
    unauth_status=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/discovery" 2>/dev/null || echo "000")
    local unauth_ok="false"
    [[ "$unauth_status" == "401" ]] && unauth_ok="true"
    results+=("{\"route\": \"GET /api/discovery (no auth)\", \"status\": $unauth_status, \"expected\": 401, \"ok\": $unauth_ok, \"ms\": 0}")
    local joined
    joined=$(IFS=,; echo "[${results[*]}]")
    echo "{\"results\": $joined}"
}

INPUT=$(cat)
ACTION=$(json_get "$INPUT" ".action")
PARAMS=$(json_get "$INPUT" ".params // {}")

case "$ACTION" in
    check-all)       action_check_all ;;
    check-route)     action_check_route "$PARAMS" ;;
    check-discovery) action_check_discovery ;;
    check-safety)    action_check_safety ;;
    *)               error_response "Unknown action: $ACTION. Supported: ${SUPPORTED_ACTIONS[*]}" "INVALID_ACTION" ;;
esac
