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

# Load API key once
load_api_key() {
    local key
    key=$(load_secret "pinecone-api-key" 2>/dev/null) || {
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
        body=$(jq -n --arg ns "$namespace" '{"filter": {"namespace": $ns}}')
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
    if ! [[ "$top_k" =~ ^[0-9]+$ ]]; then
        error_response "Parameter top_k must be a positive integer" "INVALID_PARAM"
        return 1
    fi

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

    if [[ -n "$namespace" ]]; then
        body=$(echo "$body" | jq --arg ns "$namespace" '. + {"namespace": $ns}')
    fi

    if [[ -n "$filter" ]]; then
        body=$(echo "$body" | jq --argjson f "$filter" '. + {"filter": $f}')
    fi

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

    local sorted
    sorted=$(echo "$all_results" | jq 'sort_by(-._score)')

    success_response "{\"results\": $sorted, \"namespaces_searched\": $namespaces}"
}

# ----------------------------------------------------------------
# action_rerank
# Params: query (required), documents (JSON array, required)
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
        "${PINECONE_API}/rerank" 2>/dev/null) || {
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
