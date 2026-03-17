#!/bin/bash
# screen-audit.sh — Parses SCREEN-INVENTORY.md and cross-references against the file tree
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="screen-audit"
SUPPORTED_ACTIONS=("audit" "audit-flow" "summary")

REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
INVENTORY_FILE="$REPO_ROOT/SCREEN-INVENTORY.md"
APP_DIR="$REPO_ROOT/frendli-app/app"

action_audit() {
    if [[ ! -f "$INVENTORY_FILE" ]]; then
        error_response "SCREEN-INVENTORY.md not found at $INVENTORY_FILE" "FILE_NOT_FOUND"
        return 1
    fi

    log_info "Auditing screens against $APP_DIR"

    local missing=()
    local found=()

    while IFS= read -r line; do
        if echo "$line" | grep -qE '^\| [A-Z]+-[0-9]+'; then
            local screen_path
            screen_path=$(echo "$line" | awk -F'|' '{gsub(/[[:space:]]/,"",$4); print $4}')
            if [[ -n "$screen_path" && "$screen_path" != "FilePath" ]]; then
                local full_path="$REPO_ROOT/frendli-app/$screen_path"
                if [[ -f "$full_path" ]]; then
                    found+=("$screen_path")
                else
                    missing+=("$screen_path")
                fi
            fi
        fi
    done < "$INVENTORY_FILE"

    local total=$(( ${#found[@]} + ${#missing[@]} ))
    local missing_json="[$(printf '"%s",' "${missing[@]:-}" | sed 's/,$//')]"
    local found_json="[$(printf '"%s",' "${found[@]:-}" | sed 's/,$//')]"

    echo "{\"total\": $total, \"found\": ${#found[@]}, \"missing\": ${#missing[@]}, \"missingPaths\": $missing_json}"
}

action_audit_flow() {
    local params="$1"
    local flow=$(json_get "$params" ".flow // \"H\"")
    log_info "Auditing flow $flow screens only"

    if [[ ! -f "$INVENTORY_FILE" ]]; then
        error_response "SCREEN-INVENTORY.md not found" "FILE_NOT_FOUND"
        return 1
    fi

    local missing=()
    local found=()

    while IFS= read -r line; do
        if echo "$line" | grep -qE "^\| $flow-[0-9]+"; then
            local screen_path
            screen_path=$(echo "$line" | awk -F'|' '{gsub(/[[:space:]]/,"",$4); print $4}')
            if [[ -n "$screen_path" && "$screen_path" != "FilePath" ]]; then
                local full_path="$REPO_ROOT/frendli-app/$screen_path"
                if [[ -f "$full_path" ]]; then
                    found+=("$screen_path")
                else
                    missing+=("$screen_path")
                fi
            fi
        fi
    done < "$INVENTORY_FILE"

    local missing_json="[$(printf '"%s",' "${missing[@]:-}" | sed 's/,$//')]"
    echo "{\"flow\": \"$flow\", \"found\": ${#found[@]}, \"missing\": ${#missing[@]}, \"missingPaths\": $missing_json}"
}

action_summary() {
    log_info "Screen inventory summary"
    if [[ ! -f "$INVENTORY_FILE" ]]; then
        error_response "SCREEN-INVENTORY.md not found" "FILE_NOT_FOUND"
        return 1
    fi
    local total_screens
    total_screens=$(grep -cE '^\| [A-Z]+-[0-9]+' "$INVENTORY_FILE" 2>/dev/null || echo 0)
    local total_files
    total_files=$(find "$APP_DIR" -name "*.tsx" | wc -l | tr -d ' ')
    echo "{\"inventoryScreens\": $total_screens, \"appTsxFiles\": $total_files}"
}

INPUT=$(cat)
ACTION=$(json_get "$INPUT" ".action")
PARAMS=$(json_get "$INPUT" ".params // {}")

case "$ACTION" in
    audit)       action_audit ;;
    audit-flow)  action_audit_flow "$PARAMS" ;;
    summary)     action_summary ;;
    *)           error_response "Unknown action: $ACTION. Supported: ${SUPPORTED_ACTIONS[*]}" "INVALID_ACTION" ;;
esac
