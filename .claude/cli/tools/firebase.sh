#!/bin/bash
# firebase.sh — Firebase project read operations via firebase CLI
# Replaces: mcp__plugin_firebase_firebase__ read/auth tools
# EXCLUDES: create_project, create_app, create_android_sha, init, update_environment
#           (write ops — use firebase CLI directly or MCP for those)
#
# Input:  JSON on stdin  {action, params}
# Output: JSON on stdout {success, data, error, metadata}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="firebase"
SUPPORTED_ACTIONS=("list-projects" "get-project" "list-apps" "get-sdk-config" "get-security-rules" "get-environment" "auth-status" "list")

# ----------------------------------------------------------------
# action_list_projects
# ----------------------------------------------------------------
action_list_projects() {
    log_info "Listing Firebase projects"

    local output
    output=$(firebase projects:list --json 2>/dev/null) || {
        error_response "firebase projects:list failed. Is firebase CLI authenticated?" "CLI_ERROR"
        return 1
    }

    if ! echo "$output" | jq empty 2>/dev/null; then
        error_response "firebase returned non-JSON output" "PARSE_ERROR"
        return 1
    fi

    success_response "$output"
}

# ----------------------------------------------------------------
# action_get_project
# Params: project_id (required)
# ----------------------------------------------------------------
action_get_project() {
    local params="$1"
    local project_id
    project_id=$(json_get "$params" ".project_id")

    if [[ -z "$project_id" ]]; then
        error_response "Missing required parameter: project_id" "INVALID_PARAM"
        return 1
    fi

    log_info "Getting project: $project_id"

    local output
    output=$(firebase projects:list --json 2>/dev/null | \
        jq --arg pid "$project_id" '[.[] | select(.projectId == $pid or .name == $pid)] | first') || {
        error_response "Failed to get project: $project_id" "CLI_ERROR"
        return 1
    }

    if [[ "$output" == "null" || -z "$output" ]]; then
        error_response "Project not found: $project_id" "NOT_FOUND"
        return 1
    fi

    success_response "$output"
}

# ----------------------------------------------------------------
# action_list_apps
# Params: project_id (required)
# ----------------------------------------------------------------
action_list_apps() {
    local params="$1"
    local project_id
    project_id=$(json_get "$params" ".project_id")

    if [[ -z "$project_id" ]]; then
        error_response "Missing required parameter: project_id" "INVALID_PARAM"
        return 1
    fi

    log_info "Listing apps for project: $project_id"

    local output
    output=$(firebase apps:list --project "$project_id" --json 2>/dev/null) || {
        error_response "firebase apps:list failed for project: $project_id" "CLI_ERROR"
        return 1
    }

    if ! echo "$output" | jq empty 2>/dev/null; then
        error_response "firebase returned non-JSON output" "PARSE_ERROR"
        return 1
    fi

    success_response "$output"
}

# ----------------------------------------------------------------
# action_get_sdk_config
# Params: project_id (required), app_id (required)
# ----------------------------------------------------------------
action_get_sdk_config() {
    local params="$1"
    local project_id app_id
    project_id=$(json_get "$params" ".project_id")
    app_id=$(json_get "$params" ".app_id")

    if [[ -z "$project_id" ]]; then
        error_response "Missing required parameter: project_id" "INVALID_PARAM"
        return 1
    fi
    if [[ -z "$app_id" ]]; then
        error_response "Missing required parameter: app_id" "INVALID_PARAM"
        return 1
    fi

    log_info "Getting SDK config for app: $app_id in project: $project_id"

    local output
    output=$(firebase apps:sdkconfig --project "$project_id" "$app_id" --json 2>/dev/null) || {
        error_response "firebase apps:sdkconfig failed" "CLI_ERROR"
        return 1
    }

    if ! echo "$output" | jq empty 2>/dev/null; then
        error_response "firebase returned non-JSON output" "PARSE_ERROR"
        return 1
    fi

    success_response "$output"
}

# ----------------------------------------------------------------
# action_get_security_rules
# Params: project_id (required), service (optional: firestore|database, default: firestore)
# ----------------------------------------------------------------
action_get_security_rules() {
    local params="$1"
    local project_id service
    project_id=$(json_get "$params" ".project_id")
    service=$(json_get "$params" ".service")
    service="${service:-firestore}"

    if [[ -z "$project_id" ]]; then
        error_response "Missing required parameter: project_id" "INVALID_PARAM"
        return 1
    fi

    if [[ "$service" != "firestore" && "$service" != "database" ]]; then
        error_response "Invalid service: $service (must be firestore or database)" "INVALID_PARAM"
        return 1
    fi

    log_info "Getting $service security rules for project: $project_id"

    local tmpfile
    tmpfile=$(mktemp /tmp/firebase-rules-XXXXXX.rules)

    if [[ "$service" == "firestore" ]]; then
        firebase firestore:rules:get --project "$project_id" --output "$tmpfile" 2>/dev/null
    else
        firebase database:rules:get --project "$project_id" --output "$tmpfile" 2>/dev/null
    fi || {
        rm -f "$tmpfile"
        error_response "Failed to get $service rules for project: $project_id" "CLI_ERROR"
        return 1
    }

    local result
    result=$(jq -n \
        --arg svc "$service" \
        --arg pid "$project_id" \
        --arg rules "$(cat "$tmpfile")" \
        '{"service":$svc,"project_id":$pid,"rules":$rules}')
    rm -f "$tmpfile"

    success_response "$result"
}

# ----------------------------------------------------------------
# action_get_environment
# Params: project_id (required)
# ----------------------------------------------------------------
action_get_environment() {
    local params="$1"
    local project_id
    project_id=$(json_get "$params" ".project_id")

    if [[ -z "$project_id" ]]; then
        error_response "Missing required parameter: project_id" "INVALID_PARAM"
        return 1
    fi

    log_info "Getting environment for project: $project_id"

    local project_info apps_info
    project_info=$(firebase projects:list --json 2>/dev/null | \
        jq --arg pid "$project_id" '[.[] | select(.projectId == $pid or .name == $pid)] | first') || project_info="null"
    # Validate project_info is parseable JSON; fall back to null if not
    if ! echo "$project_info" | jq empty 2>/dev/null; then
        project_info="null"
    fi
    apps_info=$(firebase apps:list --project "$project_id" --json 2>/dev/null) || apps_info="[]"
    # Validate apps_info is parseable JSON; fall back to empty array if not
    if ! echo "$apps_info" | jq empty 2>/dev/null; then
        apps_info="[]"
    fi

    local env_data
    env_data=$(jq -n \
        --argjson project "$project_info" \
        --argjson apps "$apps_info" \
        '{"project": $project, "apps": $apps}')

    success_response "$env_data"
}

# ----------------------------------------------------------------
# action_auth_status
# ----------------------------------------------------------------
action_auth_status() {
    log_info "Checking firebase auth status"

    local token_output
    token_output=$(firebase login:list 2>&1) || true

    local is_authenticated
    if echo "$token_output" | grep -q "@"; then
        is_authenticated="true"
    else
        is_authenticated="false"
    fi

    local accounts
    accounts=$(echo "$token_output" | grep "@" | jq -R . | jq -s . 2>/dev/null || echo "[]")

    success_response "{\"authenticated\": $is_authenticated, \"accounts\": $accounts}"
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
        "list-projects")      action_list_projects ;;
        "get-project")        action_get_project "$params" ;;
        "list-apps")          action_list_apps "$params" ;;
        "get-sdk-config")     action_get_sdk_config "$params" ;;
        "get-security-rules") action_get_security_rules "$params" ;;
        "get-environment")    action_get_environment "$params" ;;
        "auth-status")        action_auth_status ;;
        "list")               action_list ;;
        *)                    error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
