#!/bin/bash
# context7.sh — Library documentation lookup via Context7 REST API
# Replaces: mcp__plugin_context7_context7__resolve-library-id
#           mcp__plugin_context7_context7__query-docs
#
# Input:  JSON on stdin  {action, params}
# Output: JSON on stdout {success, data, error, metadata}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="context7"
SUPPORTED_ACTIONS=("resolve-library" "query-docs" "list")

CONTEXT7_API="https://context7.com/api"

# URL-encode a string safely (all RFC 3986 reserved chars)
url_encode() {
    local raw="$1"
    python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$raw" 2>/dev/null || {
        # Fallback: encode the critical reserved chars via printf hex
        echo "$raw" | sed \
            -e 's/%/%25/g' -e 's/ /%20/g' -e 's/&/%26/g' \
            -e 's/=/%3D/g' -e 's/+/%2B/g' -e 's/#/%23/g' \
            -e 's/?/%3F/g' -e 's|/|%2F|g'
    }
}

# ----------------------------------------------------------------
# action_resolve_library
# Params: library_name (required)
# Calls:  GET /v1/search?q=<name>
# ----------------------------------------------------------------
action_resolve_library() {
    local params="$1"
    local library_name
    library_name=$(json_get "$params" ".library_name")

    if [[ -z "$library_name" ]]; then
        error_response "Missing required parameter: library_name" "INVALID_PARAM"
        return 1
    fi

    log_info "Resolving library: $library_name"

    local encoded_name
    encoded_name=$(url_encode "$library_name")

    local response
    response=$(curl -sf \
        -H "Accept: application/json" \
        "${CONTEXT7_API}/v2/search?query=${encoded_name}" 2>/dev/null) || {
        error_response "Context7 API request failed for: $library_name" "HTTP_ERROR"
        return 1
    }

    if ! echo "$response" | jq empty 2>/dev/null; then
        error_response "Context7 returned non-JSON response" "PARSE_ERROR"
        return 1
    fi

    success_response "$response"
}

# ----------------------------------------------------------------
# action_query_docs
# Params: library_id (required), topic (optional), tokens (optional, default 5000)
# Calls:  GET /v1/<library_id>?topic=<topic>&tokens=<n>
# ----------------------------------------------------------------
action_query_docs() {
    local params="$1"
    local library_id topic tokens

    library_id=$(json_get "$params" ".library_id")
    topic=$(json_get "$params" ".topic")
    tokens=$(json_get "$params" ".tokens")
    tokens="${tokens:-5000}"

    if [[ -z "$library_id" ]]; then
        error_response "Missing required parameter: library_id" "INVALID_PARAM"
        return 1
    fi

    # Validate tokens is a positive integer
    if ! [[ "$tokens" =~ ^[0-9]+$ ]]; then
        error_response "Parameter tokens must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Querying docs for: $library_id (topic=$topic, tokens=$tokens)"

    # Encode only dangerous chars in library_id, preserve slashes for path
    local encoded_id
    encoded_id=$(echo "$library_id" | sed \
        -e 's/%/%25/g' -e 's/ /%20/g' -e 's/&/%26/g' \
        -e 's/=/%3D/g' -e 's/+/%2B/g' -e 's/#/%23/g' -e 's/?/%3F/g')

    local url="${CONTEXT7_API}/v1/${encoded_id}?tokens=${tokens}"

    if [[ -n "$topic" ]]; then
        local encoded_topic
        encoded_topic=$(url_encode "$topic")
        url="${url}&topic=${encoded_topic}"
    fi

    local response
    response=$(curl -sfL \
        -H "Accept: application/json" \
        "$url" 2>/dev/null) || {
        error_response "Context7 API request failed for: $library_id" "HTTP_ERROR"
        return 1
    }

    if ! echo "$response" | jq empty 2>/dev/null; then
        # Context7 may return markdown/text — wrap it safely with jq
        local wrapped
        wrapped=$(jq -n \
            --arg content "$response" \
            --arg lib_id "$library_id" \
            --arg t "$topic" \
            '{"content": $content, "library_id": $lib_id, "topic": $t}')
        success_response "$wrapped"
        return 0
    fi

    success_response "$response"
}

action_list() {
    local actions_json
    actions_json=$(printf '%s\n' "${SUPPORTED_ACTIONS[@]}" | jq -R . | jq -s .)
    success_response "$actions_json"
}

main() {
    local input=""
    read -t 10 -r input || input=""

    if [[ -z "$input" ]]; then
        input="{}"
    fi

    if ! parse_request "$input"; then
        error_response "Invalid request format" "PARSE_ERROR"
        return 1
    fi

    local action params
    action=$(json_get "$input" ".action")
    params=$(json_get "$input" ".params" | jq -c .)

    if ! require_action "$action" "${SUPPORTED_ACTIONS[@]}"; then
        error_response "Unsupported action: $action" "UNSUPPORTED_ACTION"
        return 1
    fi

    case "$action" in
        "resolve-library") action_resolve_library "$params" ;;
        "query-docs")      action_query_docs "$params" ;;
        "list")            action_list ;;
        *)                 error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
