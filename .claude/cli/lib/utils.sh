#!/bin/bash
# CLI Tool Utilities Library
# Provides: validation, JSON parsing, error handling, logging

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# LOGGING
# ============================================================

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $*" >&2
}

# ============================================================
# JSON PARSING & VALIDATION
# ============================================================

# Validate JSON input
# Usage: validate_json "$input_string"
# Returns: 0 if valid, 1 if invalid
validate_json() {
    local input="$1"
    if echo "$input" | jq empty 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Parse request JSON and validate required fields
# Usage: parse_request "$json_input"
# Returns: 0 if valid, 1 if invalid
parse_request() {
    local input="$1"

    if ! validate_json "$input"; then
        log_error "Invalid JSON input"
        return 1
    fi

    # Check required fields
    local action=$(echo "$input" | jq -r '.action // empty' 2>/dev/null)
    local params=$(echo "$input" | jq -r '.params // empty' 2>/dev/null)

    if [[ -z "$action" ]]; then
        log_error "Missing required field: action"
        return 1
    fi

    if [[ -z "$params" ]]; then
        log_error "Missing required field: params"
        return 1
    fi

    return 0
}

# Extract field from JSON
# Usage: json_get "$json" ".field.nested.path"
json_get() {
    local json="$1"
    local path="$2"
    echo "$json" | jq -r "$path // empty" 2>/dev/null || echo ""
}

# ============================================================
# RESPONSE FORMATTING
# ============================================================

# Success response
# Usage: success_response "$data" [optional_metadata]
success_response() {
    local data="$1"
    local metadata="${2:-{}}"

    jq -n \
        --arg success "true" \
        --argjson data "$data" \
        --argjson metadata "$metadata" \
        '{
            success: ($success == "true"),
            data: $data,
            error: null,
            metadata: $metadata
        }'
}

# Error response
# Usage: error_response "error message" [error_code] [error_details]
error_response() {
    local message="$1"
    local code="${2:-UNKNOWN_ERROR}"
    local details="${3:-{}}"

    jq -n \
        --arg message "$message" \
        --arg code "$code" \
        --argjson details "$details" \
        '{
            success: false,
            data: null,
            error: {
                code: $code,
                message: $message,
                details: $details
            },
            metadata: {}
        }'
}

# ============================================================
# ENVIRONMENT & SECRETS
# ============================================================

# Load secret from file
# Usage: load_secret "greptile-api-key"
# Looks in: ~/.claude/secrets/[name]
load_secret() {
    local name="$1"
    local secret_file="$HOME/.claude/secrets/$name"

    if [[ ! -f "$secret_file" ]]; then
        log_error "Secret not found: $name"
        return 1
    fi

    cat "$secret_file" | tr -d '\n'
}

# Load secret from environment variable (fallback)
# Usage: load_secret_env "GREPTILE_API_KEY"
load_secret_env() {
    local var_name="$1"
    local value="${!var_name:-}"

    if [[ -z "$value" ]]; then
        log_error "Environment variable not set: $var_name"
        return 1
    fi

    echo "$value"
}

# ============================================================
# EXECUTION HELPERS
# ============================================================

# Execute command with timeout
# Usage: execute_with_timeout 30 "curl ..."
execute_with_timeout() {
    local timeout="$1"
    shift

    if command -v timeout &> /dev/null; then
        timeout "$timeout" "$@" || return $?
    else
        # Fallback for systems without timeout
        "$@" || return $?
    fi
}

# Validate action is supported
# Usage: require_action "review-pr" "analyze" "fetch"
require_action() {
    local action="$1"
    shift
    local supported_actions=("$@")

    for supported in "${supported_actions[@]}"; do
        if [[ "$action" == "$supported" ]]; then
            return 0
        fi
    done

    log_error "Unknown action: $action (supported: ${supported_actions[*]})"
    return 1
}

# ============================================================
# EXPORTS
# ============================================================

export -f log_error log_warn log_info log_success
export -f validate_json parse_request json_get
export -f success_response error_response
export -f load_secret load_secret_env
export -f execute_with_timeout require_action
