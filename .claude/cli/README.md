# CLI Tool Framework

Standardized CLI-based tool integration for Claude Code and agent automation. Replaces MCP servers with lightweight, controllable CLI wrappers.

## Architecture

```
Agent/Skill
    ↓
.claude/cli/ (this framework)
    ↓
Actual tools/APIs/services
```

### Key Benefits

| Feature | MCP | CLI Framework |
|---------|-----|---------------|
| Token overhead per call | 500-1000 | 50-100 |
| Process management | Complex | Simple |
| Debugging | Black box | Shell history + stderr |
| Control | Mediated by spec | Direct |
| Functionality | 100% (structured) | 100% (JSON-wrapped) |
| Latency | Network round-trip | Subprocess spawn |

## Directory Structure

```
.claude/cli/
├── lib/
│   └── utils.sh           # Shared utilities (validation, parsing, logging)
├── tools/
│   ├── template.sh        # Template for new tools
│   ├── http-client.sh     # HTTP requests (get, post, request)
│   └── json-processor.sh  # JSON manipulation (validate, parse, transform)
├── schema/
│   └── tool-contract.json # JSON schema for I/O contract
├── examples/
│   └── (usage examples)
└── README.md
```

## I/O Contract

All tools follow a **standardized JSON contract**:

### Request Format

```json
{
  "action": "action-name",
  "params": {
    "param1": "value1",
    "param2": "value2"
  },
  "context": {
    "auth_token": "...",
    "api_key": "..."
  }
}
```

### Response Format

```json
{
  "success": true,
  "data": { /* action-specific data */ },
  "error": null,
  "metadata": {
    "execution_time": "125ms",
    "version": "1.0"
  }
}
```

Or on error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_PARAM",
    "message": "Missing required parameter: url",
    "details": {}
  },
  "metadata": {}
}
```

## Usage

### From Agent Skills

```bash
#!/bin/bash
# .agent/skills/example/SKILL.md

# Call a CLI tool
INPUT=$(jq -n \
  --arg action "get" \
  --arg url "https://api.example.com/data" \
  '{action: $action, params: {url: $url}}')

RESULT=$(./.claude/cli/tools/http-client.sh <<< "$INPUT")

# Parse response
SUCCESS=$(echo "$RESULT" | jq -r '.success')
DATA=$(echo "$RESULT" | jq -r '.data')
ERROR=$(echo "$RESULT" | jq -r '.error')

if [[ "$SUCCESS" == "true" ]]; then
    echo "Got data: $DATA"
else
    echo "Error: $ERROR"
    exit 1
fi
```

### From CLI Directly

```bash
# Make HTTP request
echo '{"action": "get", "params": {"url": "https://example.com"}}' | \
    ./.claude/cli/tools/http-client.sh

# Validate JSON
echo '{"action": "validate", "params": {"input": "{\"valid\": true}"}}' | \
    ./.claude/cli/tools/json-processor.sh

# Parse JSON with jq filter
echo '{"action": "parse", "params": {"input": "{\"a\": 1, \"b\": 2}", "path": ".a"}}' | \
    ./.claude/cli/tools/json-processor.sh
```

### From Node.js/Python

```javascript
// Node.js example
const { spawn } = require('child_process');

const request = {
    action: 'get',
    params: { url: 'https://example.com' }
};

const proc = spawn('./.claude/cli/tools/http-client.sh');
let result = '';

proc.stdout.on('data', (data) => {
    result += data;
});

proc.on('close', () => {
    const response = JSON.parse(result);
    console.log(response);
});

proc.stdin.write(JSON.stringify(request));
proc.stdin.end();
```

## Built-in Tools

### http-client.sh

Wraps curl with standardized I/O.

**Actions:**
- `get` - HTTP GET request
- `post` - HTTP POST request
- `head` - HTTP HEAD request
- `request` - Generic HTTP request
- `list` - List available actions

**Parameters:**
```json
{
  "action": "get",
  "params": {
    "url": "https://example.com",
    "headers": {"X-Custom": "value"},
    "timeout": "30"
  }
}
```

### json-processor.sh

JSON manipulation and validation.

**Actions:**
- `validate` - Validate JSON syntax
- `parse` - Extract value at JSON path
- `transform` - Apply jq filter
- `merge` - Merge multiple JSON objects
- `extract` - Extract specific keys
- `list` - List available actions

**Examples:**
```bash
# Validate JSON
echo '{"action": "validate", "params": {"input": "{\"valid\": true}"}}' | \
    ./.claude/cli/tools/json-processor.sh

# Extract value
echo '{"action": "parse", "params": {"input": "{\"x\": {\"y\": 5}}", "path": ".x.y"}}' | \
    ./.claude/cli/tools/json-processor.sh

# Transform with jq filter
echo '{"action": "transform", "params": {"input": "[1,2,3]", "filter": "map(. * 2)"}}' | \
    ./.claude/cli/tools/json-processor.sh
```

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

## Creating a New Tool

1. **Copy template:**
   ```bash
   cp .claude/cli/tools/template.sh .claude/cli/tools/my-tool.sh
   chmod +x .claude/cli/tools/my-tool.sh
   ```

2. **Edit the tool:**
   - Update `TOOL_NAME`
   - Update `SUPPORTED_ACTIONS` list
   - Implement `action_*` functions
   - Keep the main() dispatcher unchanged

3. **Test it:**
   ```bash
   echo '{"action": "list", "params": {}}' | ./.claude/cli/tools/my-tool.sh
   ```

4. **Example tool structure:**
   ```bash
   #!/bin/bash
   source "$(dirname "${BASH_SOURCE[0]}")/../lib/utils.sh"

   TOOL_NAME="my-tool"
   SUPPORTED_ACTIONS=("action1" "action2" "list")

   action_action1() {
       local params="$1"
       # Your logic here
       success_response '{"result": "data"}'
   }

   action_list() {
       printf '%s\n' "${SUPPORTED_ACTIONS[@]}" | jq -R . | jq -s . | \
           xargs jq -n --argjson actions
   }

   main() {
       # Standard dispatcher (don't change)
       local input=""
       read -t 10 -r input || input="{}"
       parse_request "$input" || { error_response "Parse error" "PARSE_ERROR"; return 1; }
       local action=$(json_get "$input" ".action")
       require_action "$action" "${SUPPORTED_ACTIONS[@]}" || { error_response "Unknown action" "UNKNOWN_ACTION"; return 1; }
       case "$action" in
           "action1") action_action1 "$(echo "$input" | jq -c '.params')" ;;
           "list") action_list ;;
           *) error_response "Unknown action" "UNKNOWN_ACTION"; return 1 ;;
       esac
   }

   [[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
   ```

## Secrets Management

Tools can access secrets safely:

```bash
# Load from file (preferred)
API_KEY=$(load_secret "greptile-api-key")

# Load from environment variable (fallback)
API_KEY=$(load_secret_env "GREPTILE_API_KEY")
```

Store secrets in: `~/.claude/secrets/[name]`

## Error Handling

All tools use consistent error responses:

```bash
# Input validation error
error_response "Missing parameter" "INVALID_PARAM" "{\"param\": \"url\"}"

# Execution error
error_response "Network timeout" "TIMEOUT_ERROR" "{\"url\": \"...\"}"

# Business logic error
error_response "File not found" "NOT_FOUND" "{\"path\": \"...\"}"
```

## Logging

Tools log to stderr (doesn't pollute JSON output):

```bash
log_info "Starting action execution"
log_warn "Slow operation detected"
log_error "Fatal error occurred"
log_success "Operation completed"
```

## Integration with Agent Rules

Update `.agent/rules/` to use CLI tools:

```markdown
# .agent/rules/03-cli-tools.md

## Available CLI Tools

- `http-client.sh` — HTTP requests (GET, POST, HEAD)
- `json-processor.sh` — JSON validation and transformation

## Usage Pattern

All CLI tools follow this contract:
- Input: JSON on stdin with `{action, params}`
- Output: JSON with `{success, data, error, metadata}`

## Example

```bash
RESULT=$(jq -n '{action: "get", params: {url: "https://..."}}' | \
    ./.claude/cli/tools/http-client.sh)
```
```

## Performance Notes

- **Startup time:** ~5-20ms per tool invocation
- **Parsing:** Batching multiple actions is more efficient than separate calls
- **Token usage:** JSON overhead ~5-10% of original request size
- **Latency:** Subprocess creation + JSON parsing = negligible vs network calls

## Troubleshooting

**Tool not executable:**
```bash
chmod +x .claude/cli/tools/*.sh
```

**JSON parsing errors:**
```bash
# Validate JSON manually
echo '{"action": "list", "params": {}}' | jq .
```

**Tool not returning output:**
```bash
# Test with verbose stderr
./.claude/cli/tools/my-tool.sh <<< '{"action": "list", "params": {}}' 2>&1
```

## Next Phase (Phase 2)

Once CLI foundation is stable:
1. Update `.agent/skills/` to use CLI tools instead of inline commands
2. Create tool-specific skills that wrap CLI calls
3. Build agent hooks that invoke CLI tools for validation/automation
4. Document each tool's integration point

---

**Last Updated:** 2026-03-16
**Version:** 1.0 (Foundation)
