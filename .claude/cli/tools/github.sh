#!/bin/bash
# github.sh — GitHub operations via gh CLI
# Standardizes scattered gh invocations into the JSON I/O contract
#
# Input:  JSON on stdin  {action, params}
# Output: JSON on stdout {success, data, error, metadata}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="github"
SUPPORTED_ACTIONS=("pr-list" "pr-view" "pr-create" "issue-list" "issue-view" "run-list" "run-view" "list")

# ----------------------------------------------------------------
# action_pr_list
# Params: state (optional: open|closed|merged|all, default: open), limit (optional, default: 20)
# ----------------------------------------------------------------
action_pr_list() {
    local params="$1"
    local state limit
    state=$(json_get "$params" ".state")
    limit=$(json_get "$params" ".limit")
    state="${state:-open}"
    limit="${limit:-20}"

    if ! [[ "$limit" =~ ^[0-9]+$ ]]; then
        error_response "Parameter limit must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Listing PRs (state=$state, limit=$limit)"

    local response
    response=$(gh pr list --state "$state" --limit "$limit" --json number,title,state,author,createdAt,url,headRefName,baseRefName 2>/dev/null) || {
        error_response "gh pr list failed. Is gh authenticated?" "CLI_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_pr_view
# Params: pr_number (required)
# ----------------------------------------------------------------
action_pr_view() {
    local params="$1"
    local pr_number
    pr_number=$(json_get "$params" ".pr_number")

    if [[ -z "$pr_number" ]]; then
        error_response "Missing required parameter: pr_number" "INVALID_PARAM"
        return 1
    fi

    if ! [[ "$pr_number" =~ ^[0-9]+$ ]]; then
        error_response "Parameter pr_number must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Viewing PR #$pr_number"

    local response
    response=$(gh pr view "$pr_number" --json number,title,state,author,body,createdAt,url,additions,deletions,changedFiles,reviews,comments 2>/dev/null) || {
        error_response "PR #$pr_number not found" "NOT_FOUND"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_pr_create
# Params: title (required), body (required), base (optional, default: main)
# ----------------------------------------------------------------
action_pr_create() {
    local params="$1"
    local title body base
    title=$(json_get "$params" ".title")
    body=$(json_get "$params" ".body")
    base=$(json_get "$params" ".base")
    base="${base:-main}"

    if [[ -z "$title" ]]; then
        error_response "Missing required parameter: title" "INVALID_PARAM"
        return 1
    fi
    if [[ -z "$body" ]]; then
        error_response "Missing required parameter: body" "INVALID_PARAM"
        return 1
    fi

    log_info "Creating PR: $title (base=$base)"

    local pr_url
    pr_url=$(gh pr create --title "$title" --body "$body" --base "$base" 2>/dev/null) || {
        error_response "gh pr create failed" "CLI_ERROR"
        return 1
    }

    local response
    response=$(jq -n --arg url "$pr_url" --arg title "$title" '{"url":$url,"title":$title}')
    success_response "$response"
}

# ----------------------------------------------------------------
# action_issue_list
# Params: state (optional: open|closed|all, default: open), limit (optional, default: 20)
# ----------------------------------------------------------------
action_issue_list() {
    local params="$1"
    local state limit
    state=$(json_get "$params" ".state")
    limit=$(json_get "$params" ".limit")
    state="${state:-open}"
    limit="${limit:-20}"

    if ! [[ "$limit" =~ ^[0-9]+$ ]]; then
        error_response "Parameter limit must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Listing issues (state=$state, limit=$limit)"

    local response
    response=$(gh issue list --state "$state" --limit "$limit" --json number,title,state,author,createdAt,url,labels 2>/dev/null) || {
        error_response "gh issue list failed" "CLI_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_issue_view
# Params: issue_number (required)
# ----------------------------------------------------------------
action_issue_view() {
    local params="$1"
    local issue_number
    issue_number=$(json_get "$params" ".issue_number")

    if [[ -z "$issue_number" ]]; then
        error_response "Missing required parameter: issue_number" "INVALID_PARAM"
        return 1
    fi

    if ! [[ "$issue_number" =~ ^[0-9]+$ ]]; then
        error_response "Parameter issue_number must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Viewing issue #$issue_number"

    local response
    response=$(gh issue view "$issue_number" --json number,title,state,author,body,createdAt,url,labels,comments 2>/dev/null) || {
        error_response "Issue #$issue_number not found" "NOT_FOUND"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_run_list
# Params: limit (optional, default: 10)
# ----------------------------------------------------------------
action_run_list() {
    local params="$1"
    local limit
    limit=$(json_get "$params" ".limit")
    limit="${limit:-10}"

    if ! [[ "$limit" =~ ^[0-9]+$ ]]; then
        error_response "Parameter limit must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Listing workflow runs (limit=$limit)"

    local response
    response=$(gh run list --limit "$limit" --json databaseId,displayTitle,status,conclusion,event,createdAt,url,workflowName 2>/dev/null) || {
        error_response "gh run list failed" "CLI_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_run_view
# Params: run_id (required)
# ----------------------------------------------------------------
action_run_view() {
    local params="$1"
    local run_id
    run_id=$(json_get "$params" ".run_id")

    if [[ -z "$run_id" ]]; then
        error_response "Missing required parameter: run_id" "INVALID_PARAM"
        return 1
    fi

    if ! [[ "$run_id" =~ ^[0-9]+$ ]]; then
        error_response "Parameter run_id must be a positive integer" "INVALID_PARAM"
        return 1
    fi

    log_info "Viewing workflow run: $run_id"

    local response
    response=$(gh run view "$run_id" --json databaseId,displayTitle,status,conclusion,event,createdAt,url,jobs,workflowName 2>/dev/null) || {
        error_response "Workflow run $run_id not found" "NOT_FOUND"
        return 1
    }

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
        "pr-list")    action_pr_list "$params" ;;
        "pr-view")    action_pr_view "$params" ;;
        "pr-create")  action_pr_create "$params" ;;
        "issue-list") action_issue_list "$params" ;;
        "issue-view") action_issue_view "$params" ;;
        "run-list")   action_run_list "$params" ;;
        "run-view")   action_run_view "$params" ;;
        "list")       action_list ;;
        *)            error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
