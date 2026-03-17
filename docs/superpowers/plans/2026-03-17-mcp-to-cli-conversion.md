# MCP → CLI Conversion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three active MCP servers (context7, firebase, pinecone) and standardize GitHub operations with four new CLI bash tools that follow the existing JSON I/O contract, achieving 80–90% token savings per call.

**Architecture:** Each new tool is a standalone bash script in `.claude/cli/tools/` that sources `lib/utils.sh` for shared helpers, reads JSON from stdin, and writes JSON to stdout. Tools are direct wrappers around `curl` (REST APIs) or existing CLIs (`firebase`, `gh`). No new dependencies are introduced.

**Tech Stack:** Bash 4.0+, `jq` 1.8+, `curl`, `firebase` CLI v15.4+, `gh` CLI, Pinecone REST API v1, Context7 REST API

**Spec:** `docs/superpowers/specs/2026-03-17-mcp-to-cli-conversion-design.md`

---

## Chunk 1: context7.sh

### Task 1: Create context7.sh

**Files:**
- Create: `.claude/cli/tools/context7.sh`

The Context7 API base is `https://context7.com/api`. Verify exact endpoint paths at `https://github.com/upstash/context7` if any call returns 404.

- [ ] **Step 1.1: Create the file**

```bash
cat > e:/Frendli/.claude/cli/tools/context7.sh << 'ENDOFFILE'
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
        "${CONTEXT7_API}/v1/search?q=${encoded_name}" 2>/dev/null) || {
        local details
        details=$(jq -n --arg n "$library_name" '{"library_name":$n}')
        error_response "Context7 API request failed" "HTTP_ERROR" "$details"
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

    # URL-encode library_id path segments (but preserve slashes between segments)
    # Context7 IDs look like /facebook/react — encode each segment separately
    local encoded_id
    encoded_id=$(echo "$library_id" | sed 's|/|SLASH|g' | while IFS= read -r seg; do
        echo "$seg" | sed 's|SLASH|/|g'
    done)
    # Simpler: encode only the dangerous chars in library_id, preserve slashes for path
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
    response=$(curl -sf \
        -H "Accept: application/json" \
        "$url" 2>/dev/null) || {
        local details
        details=$(jq -n --arg id "$library_id" '{"library_id":$id}')
        error_response "Context7 API request failed" "HTTP_ERROR" "$details"
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
    # Read full stdin (handles multi-line JSON)
    input=$(cat)
    [[ -z "$input" ]] && input="{}"

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
ENDOFFILE
```

- [ ] **Step 1.2: Make executable**

```bash
chmod +x e:/Frendli/.claude/cli/tools/context7.sh
```

- [ ] **Step 1.3: Smoke test — list action**

```bash
echo '{"action": "list", "params": {}}' | bash e:/Frendli/.claude/cli/tools/context7.sh
```

Expected output:
```json
{"success": true, "data": ["resolve-library", "query-docs", "list"], "error": null, "metadata": {}}
```

- [ ] **Step 1.4: Live test — resolve-library**

```bash
echo '{"action": "resolve-library", "params": {"library_name": "react"}}' | bash e:/Frendli/.claude/cli/tools/context7.sh
```

Expected: `success: true` with a data object containing library results. If you get a 404, check the Context7 API endpoint at `https://github.com/upstash/context7` and update the `CONTEXT7_API` variable and URL pattern in the action functions.

- [ ] **Step 1.5: Commit**

```bash
cd e:/Frendli
git add .claude/cli/tools/context7.sh
git commit -m "feat: add context7 CLI tool — replaces context7 MCP server calls"
```

---

## Chunk 2: firebase.sh

### Task 2: Create firebase.sh

**Files:**
- Create: `.claude/cli/tools/firebase.sh`

Prerequisites: Active `firebase login` session. Run `firebase login --no-localhost` if not already authenticated.

- [ ] **Step 2.1: Verify firebase auth**

```bash
firebase projects:list --json 2>/dev/null | head -5
```

Expected: JSON array of projects. If you see "not authenticated", run `firebase login --no-localhost` first.

- [ ] **Step 2.2: Create the file**

```bash
cat > e:/Frendli/.claude/cli/tools/firebase.sh << 'ENDOFFILE'
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
    # firebase CLI does not have a direct get-project --json, so we filter from list
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

    # Combine project info + apps list as environment overview
    local project_info apps_info
    project_info=$(firebase projects:list --json 2>/dev/null | \
        jq --arg pid "$project_id" '[.[] | select(.projectId == $pid or .name == $pid)] | first') || project_info="null"
    apps_info=$(firebase apps:list --project "$project_id" --json 2>/dev/null) || apps_info="[]"

    local env_data
    env_data=$(jq -n \
        --argjson project "$project_info" \
        --argjson apps "$apps_info" \
        '{"project": $project, "apps": $apps}')

    success_response "$env_data"
}

# ----------------------------------------------------------------
# action_auth_status
# Shows current firebase CLI authentication status
# ----------------------------------------------------------------
action_auth_status() {
    log_info "Checking firebase auth status"

    local token_output
    # `firebase login:list` shows authenticated accounts
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
    input=$(cat)
    [[ -z "$input" ]] && input="{}"

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
ENDOFFILE
```

- [ ] **Step 2.3: Make executable**

```bash
chmod +x e:/Frendli/.claude/cli/tools/firebase.sh
```

- [ ] **Step 2.4: Smoke test — list action**

```bash
echo '{"action": "list", "params": {}}' | bash e:/Frendli/.claude/cli/tools/firebase.sh
```

Expected: `success: true`, data array with all 8 action names.

- [ ] **Step 2.5: Live test — auth-status**

```bash
echo '{"action": "auth-status", "params": {}}' | bash e:/Frendli/.claude/cli/tools/firebase.sh
```

Expected: `success: true` with `authenticated: true` if logged in.

- [ ] **Step 2.6: Live test — list-projects**

```bash
echo '{"action": "list-projects", "params": {}}' | bash e:/Frendli/.claude/cli/tools/firebase.sh
```

Expected: `success: true` with array of project objects. If auth fails, run `firebase login --no-localhost` first.

- [ ] **Step 2.7: Commit**

```bash
cd e:/Frendli
git add .claude/cli/tools/firebase.sh
git commit -m "feat: add firebase CLI tool — replaces firebase MCP read/auth calls"
```

---

## Chunk 3: pinecone.sh

### Task 3: Create pinecone.sh

**Files:**
- Create: `.claude/cli/tools/pinecone.sh`

Prerequisites: Pinecone API key stored at `~/.claude/secrets/pinecone-api-key` (one line, no newline). Create it:
```bash
mkdir -p ~/.claude/secrets
echo -n "YOUR_PINECONE_API_KEY" > ~/.claude/secrets/pinecone-api-key
```

- [ ] **Step 3.1: Create the file**

```bash
cat > e:/Frendli/.claude/cli/tools/pinecone.sh << 'ENDOFFILE'
#!/bin/bash
# pinecone.sh — Pinecone vector database operations via REST API
# Replaces: mcp__plugin_pinecone_pinecone__ query/data tools
# EXCLUDES: create-index-for-model (use MCP or Pinecone console)
#
# Secrets: ~/.claude/secrets/pinecone-api-key
# Input:  JSON on stdin  {action, params}
# Output: JSON on stdout {success, data, error, metadata}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

TOOL_NAME="pinecone"
SUPPORTED_ACTIONS=("list-indexes" "describe-index" "describe-stats" "search-records" "upsert-records" "cascading-search" "rerank" "list")

PINECONE_API="https://api.pinecone.io"
PINECONE_RERANK_API="https://api.pinecone.io"

# Load API key once
load_api_key() {
    local key
    key=$(load_secret "pinecone-api-key" 2>/dev/null) || {
        # Fallback to env var
        key="${PINECONE_API_KEY:-}"
    }
    if [[ -z "$key" ]]; then
        error_response "Pinecone API key not found. Set ~/.claude/secrets/pinecone-api-key or PINECONE_API_KEY env var" "AUTH_ERROR"
        return 1
    fi
    echo "$key"
}

# Get index host URL from index name
get_index_host() {
    local api_key="$1"
    local index_name="$2"

    local desc
    desc=$(curl -sf \
        -H "Api-Key: $api_key" \
        -H "Accept: application/json" \
        "${PINECONE_API}/indexes/${index_name}" 2>/dev/null) || return 1

    echo "$desc" | jq -r '.host // empty'
}

# ----------------------------------------------------------------
# action_list_indexes
# ----------------------------------------------------------------
action_list_indexes() {
    local api_key
    api_key=$(load_api_key) || return 1

    log_info "Listing Pinecone indexes"

    local response
    response=$(curl -sf \
        -H "Api-Key: $api_key" \
        -H "Accept: application/json" \
        "${PINECONE_API}/indexes" 2>/dev/null) || {
        error_response "Pinecone API request failed" "HTTP_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_describe_index
# Params: index_name (required)
# ----------------------------------------------------------------
action_describe_index() {
    local params="$1"
    local index_name
    index_name=$(json_get "$params" ".index_name")

    if [[ -z "$index_name" ]]; then
        error_response "Missing required parameter: index_name" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    log_info "Describing index: $index_name"

    local response
    response=$(curl -sf \
        -H "Api-Key: $api_key" \
        -H "Accept: application/json" \
        "${PINECONE_API}/indexes/${index_name}" 2>/dev/null) || {
        error_response "Index not found or API error: $index_name" "HTTP_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_describe_stats
# Params: index_name (required), namespace (optional)
# ----------------------------------------------------------------
action_describe_stats() {
    local params="$1"
    local index_name namespace
    index_name=$(json_get "$params" ".index_name")
    namespace=$(json_get "$params" ".namespace")

    if [[ -z "$index_name" ]]; then
        error_response "Missing required parameter: index_name" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    local host
    host=$(get_index_host "$api_key" "$index_name") || {
        error_response "Could not resolve host for index: $index_name" "NOT_FOUND"
        return 1
    }
    if [[ -z "$host" ]]; then
        error_response "Index has no host — may still be provisioning: $index_name" "NOT_FOUND"
        return 1
    fi

    log_info "Getting stats for index: $index_name"

    local body="{}"
    if [[ -n "$namespace" ]]; then
        body="{\"filter\": {\"namespace\": \"$namespace\"}}"
    fi

    local response
    response=$(curl -sf \
        -X POST \
        -H "Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$body" \
        "https://${host}/describe_index_stats" 2>/dev/null) || {
        error_response "Pinecone describe_index_stats failed" "HTTP_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_search_records
# Params: index_name (required), query (text, for integrated indexes)
#         OR query_vector (float array, for standard indexes)
#         top_k (optional, default 10), namespace (optional), filter (optional JSON)
# ----------------------------------------------------------------
action_search_records() {
    local params="$1"
    local index_name query query_vector top_k namespace filter
    index_name=$(json_get "$params" ".index_name")
    query=$(json_get "$params" ".query")
    query_vector=$(echo "$params" | jq -c '.query_vector // empty')
    top_k=$(json_get "$params" ".top_k")
    namespace=$(json_get "$params" ".namespace")
    filter=$(echo "$params" | jq -c '.filter // empty')
    top_k="${top_k:-10}"

    if [[ -z "$index_name" ]]; then
        error_response "Missing required parameter: index_name" "INVALID_PARAM"
        return 1
    fi
    if [[ -z "$query" && -z "$query_vector" ]]; then
        error_response "Provide either query (text, integrated indexes) or query_vector (float array)" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    local host
    host=$(get_index_host "$api_key" "$index_name") || {
        error_response "Could not resolve host for index: $index_name" "NOT_FOUND"
        return 1
    }
    if [[ -z "$host" ]]; then
        error_response "Index has no host — may still be provisioning: $index_name" "NOT_FOUND"
        return 1
    fi

    log_info "Searching index: $index_name (top_k=$top_k)"

    # Build request body — text query for integrated indexes, vector for standard
    local body
    if [[ -n "$query_vector" ]]; then
        body=$(jq -n \
            --argjson vector "$query_vector" \
            --argjson top_k "$top_k" \
            '{"vector": $vector, "topK": $top_k, "includeMetadata": true}')
    else
        body=$(jq -n \
            --arg query "$query" \
            --argjson top_k "$top_k" \
            '{"query": {"inputs": {"text": $query}, "top_k": $top_k}}')
    fi

    # Add namespace if provided
    if [[ -n "$namespace" ]]; then
        body=$(echo "$body" | jq --arg ns "$namespace" '. + {"namespace": $ns}')
    fi

    # Add filter if provided
    if [[ -n "$filter" ]]; then
        body=$(echo "$body" | jq --argjson f "$filter" '. + {"filter": $f}')
    fi

    # Use /records/search for integrated indexes, /query for standard
    local endpoint
    if [[ -n "$query_vector" ]]; then
        endpoint="https://${host}/query"
    else
        endpoint="https://${host}/records/search"
    fi

    local response
    response=$(curl -sf \
        -X POST \
        -H "Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$body" \
        "$endpoint" 2>/dev/null) || {
        error_response "Pinecone search failed" "HTTP_ERROR"
        return 1
    }

    success_response "$response"
}

# ----------------------------------------------------------------
# action_upsert_records
# Params: index_name (required), records (JSON array, required), namespace (optional)
# For integrated indexes: records = [{id, text, ...metadata}]
# For standard indexes:   records = [{id, values: [...], metadata: {...}}]
# ----------------------------------------------------------------
action_upsert_records() {
    local params="$1"
    local index_name records namespace
    index_name=$(json_get "$params" ".index_name")
    records=$(echo "$params" | jq -c '.records // empty')
    namespace=$(json_get "$params" ".namespace")

    if [[ -z "$index_name" ]]; then
        error_response "Missing required parameter: index_name" "INVALID_PARAM"
        return 1
    fi
    if [[ -z "$records" ]]; then
        error_response "Missing required parameter: records" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    local host
    host=$(get_index_host "$api_key" "$index_name") || {
        error_response "Could not resolve host for index: $index_name" "NOT_FOUND"
        return 1
    }
    if [[ -z "$host" ]]; then
        error_response "Index has no host — may still be provisioning: $index_name" "NOT_FOUND"
        return 1
    fi

    log_info "Upserting $(echo "$records" | jq length) records to index: $index_name"

    local body
    body=$(jq -n --argjson records "$records" '{"records": $records}')

    if [[ -n "$namespace" ]]; then
        body=$(echo "$body" | jq --arg ns "$namespace" '. + {"namespace": $ns}')
    fi

    local response
    response=$(curl -sf \
        -X POST \
        -H "Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$body" \
        "https://${host}/records/upsert" 2>/dev/null) || {
        error_response "Pinecone upsert failed" "HTTP_ERROR"
        return 1
    }

    success_response "${response:-{\"upserted\": true}}"
}

# ----------------------------------------------------------------
# action_cascading_search
# Params: index_name (required), query (required), namespaces (JSON array, required)
# ----------------------------------------------------------------
action_cascading_search() {
    local params="$1"
    local index_name query namespaces
    index_name=$(json_get "$params" ".index_name")
    query=$(json_get "$params" ".query")
    namespaces=$(echo "$params" | jq -c '.namespaces // empty')

    if [[ -z "$index_name" || -z "$query" || -z "$namespaces" ]]; then
        error_response "Missing required parameters: index_name, query, namespaces" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    local host
    host=$(get_index_host "$api_key" "$index_name") || {
        error_response "Could not resolve host for index: $index_name" "NOT_FOUND"
        return 1
    }
    if [[ -z "$host" ]]; then
        error_response "Index has no host — may still be provisioning: $index_name" "NOT_FOUND"
        return 1
    fi

    log_info "Cascading search across $(echo "$namespaces" | jq length) namespaces"

    # Search each namespace in sequence, collect all results
    local all_results="[]"
    local ns_list
    mapfile -t ns_list < <(echo "$namespaces" | jq -r '.[]')

    for ns in "${ns_list[@]}"; do
        local body
        body=$(jq -n \
            --arg query "$query" \
            --arg ns "$ns" \
            '{"query": {"inputs": {"text": $query}, "top_k": 5}, "namespace": $ns}')

        local response
        response=$(curl -sf \
            -X POST \
            -H "Api-Key: $api_key" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$body" \
            "https://${host}/records/search" 2>/dev/null) || continue

        local hits
        hits=$(echo "$response" | jq --arg ns "$ns" '[(.result.hits // [])[] | . + {"_namespace": $ns}]' 2>/dev/null) || continue
        all_results=$(echo "$all_results" | jq --argjson h "$hits" '. + $h')
    done

    # Sort by score descending
    local sorted
    sorted=$(echo "$all_results" | jq 'sort_by(-._score)')

    success_response "{\"results\": $sorted, \"namespaces_searched\": $namespaces}"
}

# ----------------------------------------------------------------
# action_rerank
# Params: query (required), documents (JSON array of strings or objects, required)
#         model (optional, default: bge-reranker-v2-m3), top_n (optional)
# ----------------------------------------------------------------
action_rerank() {
    local params="$1"
    local query documents model top_n
    query=$(json_get "$params" ".query")
    documents=$(echo "$params" | jq -c '.documents // empty')
    model=$(json_get "$params" ".model")
    model="${model:-bge-reranker-v2-m3}"
    top_n=$(json_get "$params" ".top_n")

    if [[ -z "$query" || -z "$documents" ]]; then
        error_response "Missing required parameters: query, documents" "INVALID_PARAM"
        return 1
    fi

    local api_key
    api_key=$(load_api_key) || return 1

    log_info "Reranking $(echo "$documents" | jq length) documents"

    local body
    body=$(jq -n \
        --arg query "$query" \
        --argjson documents "$documents" \
        --arg model "$model" \
        '{"query": $query, "documents": $documents, "model": $model, "return_documents": true}')

    if [[ -n "$top_n" ]]; then
        body=$(echo "$body" | jq --argjson n "$top_n" '. + {"top_n": $n}')
    fi

    local response
    response=$(curl -sf \
        -X POST \
        -H "Api-Key: $api_key" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$body" \
        "${PINECONE_RERANK_API}/rerank" 2>/dev/null) || {
        error_response "Pinecone rerank failed" "HTTP_ERROR"
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
    input=$(cat)
    [[ -z "$input" ]] && input="{}"

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
        "list-indexes")    action_list_indexes ;;
        "describe-index")  action_describe_index "$params" ;;
        "describe-stats")  action_describe_stats "$params" ;;
        "search-records")  action_search_records "$params" ;;
        "upsert-records")  action_upsert_records "$params" ;;
        "cascading-search") action_cascading_search "$params" ;;
        "rerank")          action_rerank "$params" ;;
        "list")            action_list ;;
        *)                 error_response "Unknown action: $action" "UNKNOWN_ACTION"; return 1 ;;
    esac
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
ENDOFFILE
```

- [ ] **Step 3.2: Make executable**

```bash
chmod +x e:/Frendli/.claude/cli/tools/pinecone.sh
```

- [ ] **Step 3.3: Smoke test — list action**

```bash
echo '{"action": "list", "params": {}}' | bash e:/Frendli/.claude/cli/tools/pinecone.sh
```

Expected: `success: true`, data array with all 8 action names.

- [ ] **Step 3.4: Set up API key (if not already done)**

```bash
mkdir -p ~/.claude/secrets
# Paste your Pinecone API key (no quotes, no newline):
echo -n "YOUR_PINECONE_API_KEY" > ~/.claude/secrets/pinecone-api-key
```

- [ ] **Step 3.5: Live test — list-indexes**

```bash
echo '{"action": "list-indexes", "params": {}}' | bash e:/Frendli/.claude/cli/tools/pinecone.sh
```

Expected: `success: true` with an object containing `indexes` array.

- [ ] **Step 3.6: Commit**

```bash
cd e:/Frendli
git add .claude/cli/tools/pinecone.sh
git commit -m "feat: add pinecone CLI tool — replaces pinecone MCP server calls"
```

---

## Chunk 4: github.sh

### Task 4: Create github.sh

**Files:**
- Create: `.claude/cli/tools/github.sh`

Prerequisites: Active `gh auth login` session.

- [ ] **Step 4.1: Verify gh auth**

```bash
gh auth status
```

Expected: `Logged in to github.com`. If not, run `gh auth login`.

- [ ] **Step 4.2: Create the file**

```bash
cat > e:/Frendli/.claude/cli/tools/github.sh << 'ENDOFFILE'
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

    # gh pr create does not support --json; it returns the PR URL as plain text
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
    input=$(cat)
    [[ -z "$input" ]] && input="{}"

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
ENDOFFILE
```

- [ ] **Step 4.3: Make executable**

```bash
chmod +x e:/Frendli/.claude/cli/tools/github.sh
```

- [ ] **Step 4.4: Smoke test — list action**

```bash
echo '{"action": "list", "params": {}}' | bash e:/Frendli/.claude/cli/tools/github.sh
```

Expected: `success: true`, data array with all 8 action names.

- [ ] **Step 4.5: Live test — pr-list**

```bash
echo '{"action": "pr-list", "params": {"state": "open"}}' | bash e:/Frendli/.claude/cli/tools/github.sh
```

Expected: `success: true` with array (may be empty if no open PRs).

- [ ] **Step 4.6: Live test — run-list**

```bash
echo '{"action": "run-list", "params": {"limit": 5}}' | bash e:/Frendli/.claude/cli/tools/github.sh
```

Expected: `success: true` with array of recent workflow runs.

- [ ] **Step 4.7: Commit**

```bash
cd e:/Frendli
git add .claude/cli/tools/github.sh
git commit -m "feat: add github CLI tool — standardizes gh invocations with JSON I/O contract"
```

---

## Chunk 5: Documentation Updates

### Task 5: Update agent rules and manifests

**Files:**
- Modify: `.agent-rules/04-cli-tools.md`
- Modify: `.claude/cli/README.md`
- Modify: `Global_Manifest.md`
- Modify: `ANTIGRAVITY.md`

- [ ] **Step 5.1: Update `.agent-rules/04-cli-tools.md`**

Add the following four tool blocks after the `json-processor` section in [.agent-rules/04-cli-tools.md](.agent-rules/04-cli-tools.md):

```markdown
### context7

**Location:** `.claude/cli/tools/context7.sh`
**Purpose:** Library documentation lookup (replaces context7 MCP)
**Supported Actions:** `resolve-library`, `query-docs`, `list`

**Quick Examples:**
```bash
# Resolve a library name to a Context7 ID
echo '{"action": "resolve-library", "params": {"library_name": "react"}}' | \
    bash .claude/cli/tools/context7.sh

# Query docs for a library
echo '{"action": "query-docs", "params": {"library_id": "/facebook/react", "topic": "hooks", "tokens": 3000}}' | \
    bash .claude/cli/tools/context7.sh
```

### firebase

**Location:** `.claude/cli/tools/firebase.sh`
**Purpose:** Firebase project read operations (replaces firebase MCP read tools)
**Scope:** Read/auth only. For write ops (create-project, create-app), use firebase CLI directly.
**Supported Actions:** `list-projects`, `get-project`, `list-apps`, `get-sdk-config`, `get-security-rules`, `get-environment`, `auth-status`, `list`

**Quick Examples:**
```bash
# Check auth status
echo '{"action": "auth-status", "params": {}}' | bash .claude/cli/tools/firebase.sh

# List all projects
echo '{"action": "list-projects", "params": {}}' | bash .claude/cli/tools/firebase.sh

# Get SDK config for a specific app
echo '{"action": "get-sdk-config", "params": {"project_id": "my-project", "app_id": "1:xxx:web:yyy"}}' | \
    bash .claude/cli/tools/firebase.sh
```

### pinecone

**Location:** `.claude/cli/tools/pinecone.sh`
**Purpose:** Pinecone vector database operations (replaces pinecone MCP)
**Auth:** Requires `~/.claude/secrets/pinecone-api-key` or `PINECONE_API_KEY` env var
**Supported Actions:** `list-indexes`, `describe-index`, `describe-stats`, `search-records`, `upsert-records`, `cascading-search`, `rerank`, `list`

**Quick Examples:**
```bash
# List all indexes
echo '{"action": "list-indexes", "params": {}}' | bash .claude/cli/tools/pinecone.sh

# Search (integrated inference index)
echo '{"action": "search-records", "params": {"index_name": "my-index", "query": "social events near me", "top_k": 5}}' | \
    bash .claude/cli/tools/pinecone.sh
```

### github

**Location:** `.claude/cli/tools/github.sh`
**Purpose:** GitHub PR/issue/workflow operations (wraps gh CLI)
**Supported Actions:** `pr-list`, `pr-view`, `pr-create`, `issue-list`, `issue-view`, `run-list`, `run-view`, `list`

**Quick Examples:**
```bash
# List open PRs
echo '{"action": "pr-list", "params": {"state": "open"}}' | bash .claude/cli/tools/github.sh

# View recent workflow runs
echo '{"action": "run-list", "params": {"limit": 5}}' | bash .claude/cli/tools/github.sh
```
```

- [ ] **Step 5.2: Update `.claude/cli/README.md` built-in tool list**

In [.claude/cli/README.md](.claude/cli/README.md), find the `## Built-in Tools` section and append:

```markdown
### context7.sh

Queries Context7 library documentation API.

**Actions:** `resolve-library`, `query-docs`, `list`

### firebase.sh

Wraps `firebase` CLI for project read operations.

**Actions:** `list-projects`, `get-project`, `list-apps`, `get-sdk-config`, `get-security-rules`, `get-environment`, `auth-status`, `list`

### pinecone.sh

Wraps Pinecone REST API for vector database operations.

**Actions:** `list-indexes`, `describe-index`, `describe-stats`, `search-records`, `upsert-records`, `cascading-search`, `rerank`, `list`

**Auth:** `~/.claude/secrets/pinecone-api-key`

### github.sh

Wraps `gh` CLI for GitHub PR/issue/workflow operations.

**Actions:** `pr-list`, `pr-view`, `pr-create`, `issue-list`, `issue-view`, `run-list`, `run-view`, `list`
```

- [ ] **Step 5.3: Update `Global_Manifest.md`**

In [Global_Manifest.md](Global_Manifest.md), find the `## Active Execution Tools` table and add:

```markdown
| `.claude/cli/tools/context7.sh` | Context7 docs lookup | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/firebase.sh` | Firebase read ops | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/pinecone.sh` | Pinecone vector DB ops | Bash | 2026-03-17 | Claude | ✅ Production |
| `.claude/cli/tools/github.sh` | GitHub PR/issue/CI ops | Bash | 2026-03-17 | Claude | ✅ Production |
```

Also update `## Project Dependencies` to note:
```markdown
| Pinecone | Vector search | REST v1 | Per plan | ✅ Active (CLI) | Claude |
| Firebase | Project config | CLI v15 | N/A | ✅ Active (CLI) | Claude |
| Context7 | Docs lookup | REST v1 | Public | ✅ Active (CLI) | Claude |
```

- [ ] **Step 5.4: Update `ANTIGRAVITY.md`**

In [ANTIGRAVITY.md](ANTIGRAVITY.md), update the CLI Tools line under `## Integration Points`:

```markdown
- **CLI Tools**: Located in `.claude/cli/tools/` — includes http-client, json-processor, git-ops, file-processor, market-research, benchmark, **context7** (docs), **firebase** (project read ops), **pinecone** (vector DB), **github** (PR/issues/CI). MCP plugins remain enabled as fallback for write operations.
```

- [ ] **Step 5.5: Commit documentation updates**

```bash
cd e:/Frendli
git add .agent-rules/04-cli-tools.md .claude/cli/README.md Global_Manifest.md ANTIGRAVITY.md
git commit -m "docs: update CLI tool registry — add context7, firebase, pinecone, github tools"
```

---

## Final Verification

- [ ] **Step 6.1: Run all four smoke tests together**

```bash
cd e:/Frendli
for tool in context7 firebase pinecone github; do
    echo -n "Testing $tool: "
    result=$(echo '{"action": "list", "params": {}}' | bash .claude/cli/tools/${tool}.sh)
    success=$(echo "$result" | jq -r '.success')
    if [[ "$success" == "true" ]]; then
        echo "PASS"
    else
        echo "FAIL — $result"
    fi
done
```

Expected: All four print `PASS`.

- [ ] **Step 6.2: Verify tool count**

```bash
ls e:/Frendli/.claude/cli/tools/*.sh | wc -l
```

Expected: `11` (7 original + 4 new)
